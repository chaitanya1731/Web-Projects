// -*- mode: JavaScript; -*-

import BlogError from './blog-error.js';
import Validator from './validator.js';

//debugger; //uncomment to force loading into chrome debugger

/**
A blog contains users, articles and comments.  Each user can have
multiple Role's from [ 'admin', 'author', 'commenter' ]. An author can
create/update/remove articles.  A commenter can comment on a specific
article.

Errors
======

BAD_CATEGORY:
  Category is not one of 'articles', 'comments', 'users'.

BAD_FIELD:
  An object contains an unknown field name or a forbidden field.

BAD_FIELD_VALUE:
  The value of a field does not meet its specs.

BAD_ID:
  Object not found for specified id for update/remove
  Object being removed is referenced by another category.
  Other category object being referenced does not exist (for example,
  authorId in an article refers to a non-existent user).

EXISTS:
  An object being created already exists with the same id.

MISSING_FIELD:
  The value of a required field is not specified.

*/

export default class Blog544 {

  constructor(meta, options) {
    //@TODO
    this.meta = meta;
    this.options = options;
    this.validator = new Validator(meta);
    this.users = [];
    this.articles = [];
    this.comments = [];
  }

  static async make(meta, options) {
    //@TODO
    return new Blog544(meta, options);
  }

  /** Remove all data for this blog */
  async clear() {
    //@TODO
    this.meta.users = [];
    this.meta.articles = [];
    this.meta.comments = [];
    this.users = [];
    this.articles = [];
    this.comments = [];
  }

  /** Create a blog object as per createSpecs and 
   * return id of newly created object 
   */
  async create(category, createSpecs) {
    const obj = this.validator.validate(category, 'create', createSpecs);
    //@TODO
    try {
      if (category === "users") {
        //let userInfo = await this.find(category, {id: obj.id});
        let userInfo = findUser(this.meta.users, obj.id);
        try {
          if (isUserPresent(userInfo)) {
            throw [new BlogError('EXIST', 'Object with id ' + obj.id + ' already exists for users')];
          } else {
            this.users.push(obj);
            this.meta.users = this.users;
          }
        } catch (e) {
          throw e;
        }
      }
      else if (category === "articles") {
        //let userInfo = await this.find("users", {id: createSpecs.authorId});
        let userInfo = findUser(this.meta.users, createSpecs.authorId);
        try {
          if (isUserPresent(userInfo)) {
            obj.id = (Math.random() * 90 + 10).toFixed(4);
            this.articles.push(obj);
            this.meta.articles = this.articles;
          } else {
            throw [new BlogError('BAD_ID', 'Invalid id ' + createSpecs.authorId + ' for users for create articles')];
          }
        } catch (e) {
          throw e;
        }
      }
      else if (category === "comments") {
        /*let userInfo = await this.find("users", {id: createSpecs.commenterId});
        let articleInfo = await this.find("articles", {id: createSpecs.articleId});*/
        let userInfo = findUser(this.meta.users, createSpecs.commenterId);
        let articleInfo = findArticle(this.meta.articles, createSpecs.articleId);
        try {
          if (isUserPresent(userInfo)) {
            if (isArticlesPresent(articleInfo)) {
              obj.id = (Math.random() * 90 + 100).toFixed(4);
              this.comments.push(obj);
              this.meta.comments = this.comments;
            } else {
              //console.log("Article does not exist");
              throw [new BlogError('BAD_ID', 'Invalid id ' + createSpecs.articleId + ' for articles for create comments')];
            }
          } else {
            //console.log("User does not exist");
            throw [new BlogError('BAD_ID', 'Invalid id ' + createSpecs.commenterId + ' for articles for create comments')];
          }
        } catch (e) {
          throw e;
        }
      }
      return obj.id;
    } catch (e) {
      throw e;
    }
  }

  /** Find blog objects from category which meets findSpec.  Returns
   *  list containing up to findSpecs._count matching objects (empty
   *  list if no matching objects).  _count defaults to DEFAULT_COUNT.
   */
  async find(category, findSpecs={}) {
    const obj = this.validator.validate(category, 'find', findSpecs);
    //@TODO
    let data = [];
    let objectKey = Object.keys(findSpecs);
    try {
      if (category === "users") {
        if ((!(Object.entries(findSpecs).length === 0 && findSpecs.constructor === Object)) || findSpecs.hasOwnProperty("_count")) {
          //let userInfo = findUser(this.meta.users, findSpecs.id);
          let userInfo = this.meta.users.filter(item => item.id === findSpecs.id || item.email === findSpecs.email
              || item.firstName === findSpecs.firstName || item.lastName === findSpecs.lastName);
          //let userInfo = this.meta.users.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]] );
          if (isUserPresent(userInfo)) {
            if(!(findSpecs.hasOwnProperty("id")) && !(findSpecs.hasOwnProperty("_count"))){
              data = this.meta.users.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
              console.log(objectKey[0] + ': ' + data.length);
            }
            if (findSpecs.hasOwnProperty("id")) {
              //data.push(this.meta.users.find(item => item[objectKey[0]] === findSpecs[objectKey[0]]));
              data = this.meta.users.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
              if(data.length > 1){
                throw [new BlogError('BAD_ID', 'Cannot have multiple users of same id')]
              }
            }
            else if (Object.entries(findSpecs).length > 1 && findSpecs.hasOwnProperty("_count")) {
              console.log(objectKey[0] + ': ' + userInfo.length);
              //data = userInfo.slice(0, findSpecs["_count"]);
              data = this.meta.users.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
              data = data.slice(0, findSpecs['_count'])
            }
          }
          else if (Object.entries(findSpecs).length === 1 && findSpecs.hasOwnProperty("_count")) {
            data = this.meta.users.slice(0, findSpecs[objectKey[0]]);
          }
          else {
            throw [new BlogError('BAD_ID', 'Object with id ' + obj.id + ' does not exist for users')]
          }
        } else {
          data = this.meta.users.slice(0, DEFAULT_COUNT);
        }
      }
      else if (category === "articles") {
        if (!(Object.entries(findSpecs).length === 0 && findSpecs.constructor === Object)) {
          if (Object.entries(findSpecs).length >= 1 && findSpecs.hasOwnProperty("keywords")) {
            //let keywordArray = findSpecs.keywords.concat();
            data = this.meta.articles.filter(item => findSpecs.keywords.every(value => item.keywords.includes(value)))
            console.log(objectKey[0] + ': ' + data.length);
            if (findSpecs.hasOwnProperty("_count")) {
              //console.log(objectKey[0] + ': ' + data.length);
              data = data.slice(0, findSpecs["_count"]);
            }
          } else if ((Object.entries(findSpecs).length >= 1 && !findSpecs.hasOwnProperty("_count")) ||
              (Object.entries(findSpecs).length > 1 && findSpecs.hasOwnProperty("_count"))) {
            data = this.meta.articles.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
            console.log(objectKey[0] + ': ' + data.length);
            if (findSpecs.hasOwnProperty("_count")) {
              console.log(objectKey[0] + ': ' + data.length);
              data = data.slice(0, findSpecs["_count"]);
            }
          } else if (Object.entries(findSpecs).length === 1 && findSpecs.hasOwnProperty("_count")) {
            console.log(objectKey[0] + ': ' + data.length);
            data = this.meta.articles.slice(0, findSpecs["_count"]);
          }
        } else {
          data = this.meta.articles.slice(0, DEFAULT_COUNT);
        }

      }
      else if (category === "comments") {
        if (!(Object.entries(findSpecs).length === 0 && findSpecs.constructor === Object)) {
          let commentsList = this.meta.comments.filter(item => item.id === findSpecs.id
              || item.commenterId === findSpecs.commenterId || item.articleId === findSpecs.articleId);
          if (isCommentsPresent(commentsList)) {
            if (Object.entries(findSpecs).length >= 1 && !findSpecs.hasOwnProperty("_count")) {
              data = this.meta.comments.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
              console.log(objectKey[0] + ': ' + data.length);
              data = data.slice(0, DEFAULT_COUNT);
            }
            else if (Object.entries(findSpecs).length > 1 && findSpecs.hasOwnProperty("_count")) {
              data = this.meta.comments.filter(item => item[objectKey[0]] === findSpecs[objectKey[0]]);
              console.log(objectKey[0] + ': ' + data.length);
              data = data.slice(0, findSpecs["_count"])
            }

            if (Object.entries(findSpecs).length === 1 && findSpecs.hasOwnProperty("_count")) {
              //console.log(objectKey[0] + ': ' + data.length);
              data = this.meta.comments.slice(0, findSpecs["_count"]);
            }
          } else {
            throw [new BlogError('BAD_ID', 'Object with id does not exist for comments')]
          }
        }
        else {
          data = this.meta.comments.slice(0, DEFAULT_COUNT);
        }
      }
    } catch (e) {
      throw e;
    }
    return  data;
  }

  /** Remove up to one blog object from category with id == rmSpecs.id. */
  async remove(category, rmSpecs) {
    let exception = [];
    const obj = this.validator.validate(category, 'remove', rmSpecs);
    if(category === "users"){
      let userInfo = await this.find(category, rmSpecs);
      //let userInfo = findUser(this.meta.users, rmSpecs.id);
      try {
        if (isUserPresent(userInfo)) {
          //now if user present then check if its articles and comments are present
          //let articlesList = articlesForUserId(this.meta.articles, rmSpecs.id);
          let commentsList = commentsForUserId(this.meta.comments, rmSpecs.id);

          let articlesList = await this.find("articles", {authorId:rmSpecs.id});
          //let commentsList = await this.find("comments", {commenterId: rmSpecs.id});

          if (isArticlesPresent(articlesList) && isCommentsPresent(commentsList)) {
            let errMsgArticles = articlesErrorMsgForUsers(articlesList, rmSpecs.id);
            exception.push(errMsgArticles);
            let errMsgComments = commentErrorMsgForUsers(commentsList, rmSpecs.id);
            exception.push(errMsgComments);
            throw exception;
          }
          else if (isArticlesPresent(articlesList)) {
            let errMsgArticles = articlesErrorMsgForUsers(articlesList, rmSpecs.id);
            exception.push(errMsgArticles);
            throw exception;
          }
          else if (isCommentsPresent(commentsList)) {
            let errMsgComments = commentErrorMsgForUsers(commentsList, rmSpecs.id);
            exception.push(errMsgComments);
            throw exception;
          }
          else {
            //if either of articles or comments not present that means even comments are not present then delete the user
            this.users = this.users.filter(item => item.id !== rmSpecs.id);
            this.meta.users = this.meta.users.filter(item => item.id !== rmSpecs.id);

            //let index = this.meta.users.findIndex(item => item.id === rmSpecs.id);
            //this.meta.users = this.meta.users.splice(index, 1);
          }

        } else {
          throw [new BlogError('BAD_ID', 'User with Id ' + rmSpecs.id + ' does not exist')]
        }
      } catch (e) {
        throw e;
      }
    }
    else if (category === "articles") {
      let articleInfo = await this.find(category, rmSpecs);
      try {
        if (articleInfo[0] !== undefined && articleInfo.length > 0) {
          let commentsList = commentsForArticleId(this.meta.comments, rmSpecs.id);
          if (isCommentsPresent(commentsList)) {
            commentErrorMsgForArticles(commentsList, rmSpecs.id);
          } else {
            this.articles = this.articles.filter(item => item.id !== rmSpecs.id);
            this.meta.articles = this.meta.articles.filter(item => item.id !== rmSpecs.id);
          }
        } else {
          throw [new BlogError('BAD_ID', 'no article for id' + rmSpecs.id + ' in remove')];
        }
      } catch (e) {
        throw e;
      }
    }
    else if (category === "comments") {
      //@TODO
      let commentInfo = await this.find(category, rmSpecs);
      try {
        if (isCommentsPresent(commentInfo)) {
          this.comments = this.comments.filter(item => item.id !== rmSpecs.id);
          this.meta.comments = this.meta.comments.filter(item => item.id !== rmSpecs.id);
        } else {
          throw [new BlogError('BAD_ID', 'no comments for id' + rmSpecs.id + ' in remove')];
        }
      } catch (e) {
        throw e;
      }
    }
  }

  /** Update blog object updateSpecs.id from category as per
   *  updateSpecs.
   */
  async update(category, updateSpecs) {
    const obj = this.validator.validate(category, 'update', updateSpecs);
    //@TODO
    let objectKey = Object.keys(updateSpecs);
    if (category === "users"){
      let userInfo = await this.find(category, {id:updateSpecs.id});
      try {
        if (isUserPresent(userInfo)) {
          let userIndex = this.meta.users.findIndex(value => value.id === updateSpecs.id);
          this.meta.users[userIndex][objectKey[1]] = updateSpecs[[objectKey[1]]];
          this.meta.users[userIndex].updateTime = new Date();
        } else {
          throw [new BlogError('BAD_ID', 'Bad Id ' + updateSpecs.id + ' for update user')]
        }
      } catch (e) {
        throw e;
      }
    }
    else if (category === "articles"){
      let articleInfo = await this.find(category, {id:updateSpecs.id})
      try {
        if (isArticlesPresent(articleInfo)) {
          let articleIndex = this.meta.articles.findIndex(value => value.id === updateSpecs.id);
          this.meta.articles[articleIndex][objectKey[1]] = updateSpecs[[objectKey[1]]];
          this.meta.articles[articleIndex].updateTime = new Date();
        } else {
          throw [new BlogError('BAD_ID', 'Bad Id ' + updateSpecs.id + ' for update article')];
        }
      } catch (e) {
        throw e;
      }
    }
    else if (category === "comments"){
      let commentInfo = await this.find(category, {id:updateSpecs.id});
      try {
        if (isCommentsPresent(commentInfo)) {
          let commentIndex = this.meta.comments.findIndex(value => value.id === updateSpecs.id);
          this.meta.comments[commentIndex][objectKey[1]] = updateSpecs[[objectKey[1]]];
          this.meta.comments[commentIndex].updateTime = new Date();
        } else {
          throw [new BlogError('BAD_ID', 'Bad Id ' + updateSpecs.id + ' for update comment')];
        }
      } catch (e) {
        throw e;
      }
    }
  }
}


const DEFAULT_COUNT = 5;
//You can add code here and refer to it from any methods in Blog544.

function isCountGiven(findSpecs) {
  return (findSpecs.hasOwnProperty('_count') ? true : false);
}
function commentsForArticleId(comments, id){
  return comments.filter(item => item.articleId === id);
}
function commentsForUserId(comments, id){
  return comments.filter(item => item.commenterId === id);
}
function articlesForUserId(articles, id){
  return articles.filter(item => item.authorId === id);
}
function findUser(users, id) {
  return users.filter(item => item.id === id);
}
function findArticle(articles, id){
  return articles.filter(item => item.id === id);
}
function isUserPresent(UserList){
  return ((UserList[0] !== undefined && UserList.length > 0) ? true : false);
}
function isArticlesPresent(articlesList){
  return ((articlesList[0] !== undefined && articlesList.length > 0) ? true : false);
}
function isCommentsPresent(commentsList) {
  return ((commentsList[0] !== undefined && commentsList.length > 0) ? true : false);
}
function commentErrorMsgForArticles(commentsList, id){
  throw [new BlogError('BAD_ID', 'articles ' + id +
      ' referenced by articleId for comments ' + commentsList.map(item=> item['id']))];
}
function commentErrorMsgForUsers(commentsList, id){
  let errMsgComments = new BlogError('BAD_ID', 'users ' + id +
      ' referenced by authorId for comments ' + commentsList.map(item => item['id']));
  return errMsgComments;
}
function articlesErrorMsgForUsers(articlesList, id){
  let errMsgArticles = new BlogError('BAD_ID', 'users ' + id +
      ' referenced by authorId for articles ' + articlesList.map(item => item['id']));
  return errMsgArticles;
}