import assert from 'assert';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';

import BlogError from './blog-error.js';

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

export default function serve(port, meta, model) {
  const app = express();
  app.locals.port = port;
  app.locals.meta = meta;
  app.locals.model = model;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function setupRoutes(app) {
  app.use(cors());
  app.use(bodyParser.json());

  app.get('/meta', doGetMeta(app))
  app.get(`/`, doGet(app));
  for (let category of Object.keys(app.locals.meta)){
    app.get(`/${category}`, doGetCategory(app, category));
    app.get(`/${category}/:id`, doGetObject(app, category));
    app.delete(`/${category}/:id`, doDelete(app, category));
    app.patch(`/${category}/:id`, doUpdate(app, category));
    app.post(`/${category}`, doCreate(app, category));
  }
  app.use(doErrors());
}

/****************************** Handlers *******************************/

function doGet(app) {
  return errorWrap(async function(req, res){
    try{
      const result = {};
      result.links = getSelfLink(req);
      result.links.push(getLinks(req, "meta"))
      for (let collection of Object.keys(app.locals.meta)){
        result.links.push(getLinks(req, collection));
      }
      res.json(result);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  })
}

function doGetObject(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const id = req.params.id;
      const results = await app.locals.model.find(category, { id: id });
      const data = {};
      results.map(item => {
        item.links = getSelfLink(req);
      });
      data[category] = results;
      res.json(data);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doGetCategory(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const url = requestUrl(req);
      const parameters = req.query || {};
      const startIndex = Number(parameters._index || 0);
      const count = Number(parameters._count || DEFAULT_COUNT);
      const results = await app.locals.model.find(category, parameters);
      const data = {};
      results.map(item => {
        item.links = getSelfLink(req, item.id);
      });
      data[category] = results;
      data.links = getLink(req, parameters);

      //next info
      const nextIndex = startIndex + count;
      if (!(results.length < count)) {
        data.next = nextIndex;
        const nextParams = Object.assign({}, parameters, {_index: nextIndex});
        const nextUrl = `${url}?${querystring.stringify(nextParams)}`;
        data.links.push({rel: 'next', href: nextUrl, name: 'next'});
      }

      //previous info
      if (startIndex > 0) {
        let previousIndex = startIndex - count;
        if (previousIndex < 0) previousIndex = 0;
        data.prev = previousIndex;
        const previousParams = Object.assign({}, parameters, { _index: previousIndex });
        const previousUrl = `${url}?${querystring.stringify(previousParams)}`;
        data.links.push({ rel: 'prev', href: previousUrl, name: 'prev' });
      }

      res.json(data);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doGetMeta(app) {
  return errorWrap(async function(req, res) {
    try {
      let results = await Object.assign({}, app.locals.meta);
      results.links = getSelfLink(req);
      res.json(results);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doCreate(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const obj = req.body;
      const results = await app.locals.model.create(category, obj);
      res.append('Location', requestUrl(req) + '/' + obj.id);
      res.sendStatus(CREATED);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doDelete(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const id = req.params.id;
      const results = await app.locals.model.remove(category, { id: id});
      res.sendStatus(OK);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

function doUpdate(app, category) {
  return errorWrap(async function(req, res) {
    try {
      const patch = Object.assign({}, req.body);
      patch.id = req.params.id;
      const results = await app.locals.model.update(category, patch);
      res.sendStatus(OK);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  });
}

/**************************** Error Handling ***************************/

/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}

/** Set up error handling for handler by wrapping it in a
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}

const ERROR_MAP = {
  BAD_CATEGORY: NOT_FOUND,
  EXISTS: CONFLICT,
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  console.error(err);
  return (err instanceof Array && err.length > 0 && err[0] instanceof BlogError)
      ? { status: (ERROR_MAP[err[0].code] || BAD_REQUEST),
        code: err[0].code,
        message: err.map(e => e.message).join('; '),
      }
      : {
        status: SERVER_ERROR,
        code: 'INTERNAL',
        message: err.toString()
      };
}

/****************************** Utilities ******************************/

/** Return original URL for req (excluding query params)
 *  Ensures that url does not end with a /
 */
function requestUrl(req) {
  const port = req.app.locals.port;
  const originalUrl = req.originalUrl.replace(/\/?(\?.*)?$/, '');
  let url = `${req.protocol}://${req.hostname}:${port}${originalUrl}`
  return url;
}

const DEFAULT_COUNT = 5;

//@TODO

//for route /id
function getSelfLink(req, id) {
  const links = [
    {
      rel: "self",
      href: (id !== undefined) ? requestUrl(req) + `/${id}` : requestUrl(req),
      name: "self"
    }
  ];
  return links;
}
function getLinks(req, object) {
  const links = {
    rel: (object === "meta") ? "describedby" : "collection",
    href: requestUrl(req) + `/${object}`,
    name: object
  };
  return links;
}

function getLink(req, parameters) {
  const links = [
    {
      rel: "self",
      href: (Object.entries(parameters).length !== 0)
          ? `${requestUrl(req)}?${querystring.stringify(req.query)}` : requestUrl(req),
      name: "self"
    }
  ];
  return links;
}