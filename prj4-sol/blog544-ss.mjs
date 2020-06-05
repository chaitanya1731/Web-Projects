//-*- mode: javascript -*-

import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import Path from 'path';
import mustache from 'mustache';
import querystring from 'querystring';

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';
const USER_CATEGORY = "users";

//emulate commonjs __dirname in this ES6 module
const __dirname = Path.dirname(new URL(import.meta.url).pathname);

export default function serve(port, ws) {
  const app = express();
  app.locals.port = port;
  app.locals.ws = ws;       //web service wrapper
  //process.chdir(__dirname); //so paths relative to this dir work
  setupTemplates(app);
  const USER_FIELDS = getUserFields(app.locals.ws.meta[USER_CATEGORY]);
  setupRoutes(app, USER_FIELDS);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

/******************************** Routes *******************************/

function setupRoutes(app, USER_FIELDS) {
  app.use('/', express.static(STATIC_DIR));
  //@TODO add routes to handlers
  app.get(`/${USER_CATEGORY}`, listUsers(app));
  app.get(`/search/${USER_CATEGORY}`, searchUsers(app, USER_FIELDS));
  app.use(doErrors(app)); //must be last   
}

/****************************** Handlers *******************************/

//@TODO: add handlers
function listUsers(app) {
  return async function(req, res) {
    try{
      if(req.query.hasOwnProperty("id") && req.query.hasOwnProperty("isUserCheck")){
        delete req.query.isUserCheck;
        const resultUser = await app.locals.ws.list(USER_CATEGORY, req.query);
        const userInfo = resultUser.users;
        return res.json(userInfo);
      }
      const searchParams = await Object.assign({}, req.query) || {};
      const result = await app.locals.ws.list(USER_CATEGORY, searchParams);
      const users = result.users.map(item => {
        return {
          ...item,
          creationTime: new Date(item.creationTime).toLocaleDateString('en-US'),
          updateTime:  new Date(item.updateTime).toLocaleDateString('en-US')
        }
      });
      const model = { users: users };
      if(result.next !== undefined) {
        searchParams._index = result.next;
        const nextLink = querystring.stringify(searchParams);
        model.next = nextLink;
      }
      if(result.prev !== undefined) {
        searchParams._index = result.prev;
        const prevLink = querystring.stringify(searchParams);
        model.prev = prevLink;
      }
      const html = doMustache(app, 'summary', model);
      res.send(html);
    }
    catch (err) {
      console.log(err);
      //throw err;
    }
  };
};

function searchUsers(app, USER_FIELDS) {
  return async function(req, res) {
    const isSubmit = req.query.submit !== undefined;
    let errors;
    const getParams = Object.assign({}, req.query);
    delete getParams.submit;
    const searchParams = getNonEmptyValues(getParams);
    let result, model, template;
    let users = [];
    if(isSubmit){
      if(Object.keys(searchParams).length === 0){
        errors = { _: 'One or more values must be specified'};
      }
      if(!errors){
        try{
          result =  await app.locals.ws.list(USER_CATEGORY, searchParams);
          users = result.users;
          if (users.length > 0){
            return res.redirect(`/${USER_CATEGORY}?${querystring.stringify(searchParams)}`);
          }
          else {
            errors = { _: 'No users found for specified query.'};
          }
        }
        catch(err){
          //web service error section
          console.log(err);
          errors = {}
          err.errors.forEach(function (item) {
            errors[item.name] = (item.message) ? (item.message) : 'server error' ;
          });
        }
      }
    }
    template = 'search';
    model = errorModel(searchParams, errors, USER_FIELDS);
    const html = doMustache(app, template, model);
    res.send(html);
  };
}

function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}
function fieldsWithValues(values, errors={}, USER_FIELDS) {
  return USER_FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}

function errorModel(values={}, errors={}, USER_FIELDS) {
  return {
    errors: errors._,
    fields: fieldsWithValues(values, errors, USER_FIELDS)
  };
}

function doErrors(app) {
  return async function(err, req, res, next) {
    console.log('doErrors()');
    const errors = [ `Server error` ];
    const html = doMustache(app, `errors`, {errors, });
    res.send(html);
    console.error(err);
  };
}


/************************ General Utilities ****************************/

/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      console.log('errorWrap()');
      next(err);
    }
  };
}

function isNonEmpty(v) {
  return (v !== undefined) && v.trim().length > 0;
}

/************************ Mustache Utilities ***************************/

function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

function setupTemplates(app) {
  app.templates = {};
  for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

function getUserFields(usersMeta){
  const fieldsToRemove = usersMeta.filter(e => {
    if (e.name !== "id") {
      return Object.keys(e.forbidden).some(k => e.forbidden[k].includes("find"));
    }
  }).map(el =>  el.name );
  const userMeta = usersMeta
      .filter(e => !fieldsToRemove.includes(e.name))
      .map(item => { return {
          ...item,
          friendlyName: item.friendlyName.replace(/(^\w{1})|(\s{1}\w{1})/g,
                  match => match.toUpperCase())
        }
      });
  return userMeta;
}