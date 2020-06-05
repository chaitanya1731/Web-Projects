// -*- mode: JavaScript; -*-

import mongo from 'mongodb';
import assert from 'assert';

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

 DB:
 Database error

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
        this.client = options.client;
        this.db = options.db;
        this.data = {};
        this.indexing = {};
        for (const [category, fields] of Object.entries(meta)) {
            this.data[category] = { data: {}, indexes: {} };
            for (const field of fields) {
                if (field.doIndex) this.data[category].indexes[field.name] = {};
            }
        }

    }

    /** options.dbUrl contains URL for mongo database */
    static async make(meta, options) {
        //@TODO
        this.url = options.dbUrl;
        this.dbName = 'project2_ckulkar2';
        const splits = this.url.split('://');
        const dbIndex = this.url.lastIndexOf('/');
        if (dbIndex < 0 || splits.length !== 2 || splits[0] !== 'mongodb') {
            const msg = `bad mongodb url '${this.url}'`;
            throw [ new BlogError('BAD_MONGO_URL', msg) ];
        }
        options.client = await mongo.connect(this.url, MONGO_CONNECT_OPTIONS);
        options.db = options.client.db(this.dbName);
        return new Blog544(meta, options);
    }

    /** Release all resources held by this blog.  Specifically, close
     *  any database connections.
     */
    async close() {
        //@TODO
        await this.client.close();
    }

    /** Remove all data for this blog */
    async clear() {
        //@TODO
        for (const collection of COLLECTIONS){
            await this.db.collection(collection).deleteMany({});
            await this.db.collection(collection).dropIndexes();
        }
        await this.client.close();
    }

    /** Create a blog object as per createSpecs and
     * return id of newly created object
     */
    async create(category, createSpecs) {
        const obj = this.validator.validate(category, 'create', createSpecs);
        //@TODO
        const collection = this.data[category];
        for (let [item, value] of Object.entries(collection.indexes) ){
            value = 1;
            if(item === "creationTime") value = -1;
            this.indexing[item] = value;
        }
        if (!createSpecs.hasOwnProperty("_id")) {
            if (this._isConnected()) {
                if (category === 'users' && obj.id !== undefined) {
                    if (await this._isUserPresent(obj.id) > 0) {
                        throw [new BlogError('EXISTS', `users object having id ${obj.id} already exists`)]
                    } else {
                        const userDetails = Object.assign({_id: obj.id}, obj);
                        const usersCollection = this.db.collection('users');
                        const ret = await usersCollection.insertOne(userDetails);
                        assert(ret.insertedId === userDetails.id);
                        this.db.collection(category).createIndex(this.indexing);
                    }
                }
                else if (category === 'articles') {
                    if (await this._isUserPresent(obj.authorId) > 0) {
                        obj.id = (Math.random() * 90 + 10).toFixed(4);
                        const articlesDetails = Object.assign({_id: obj.id}, obj);
                        const articlesCollection = this.db.collection('articles');
                        await articlesCollection.insertOne(articlesDetails);
                        this.db.collection(category).createIndex(this.indexing);
                    } else {
                        throw [new BlogError('BAD_ID', `Invalid id ${obj.authorId} for users for create articles`)]
                    }
                }
                else if (category === 'comments') {
                    if (await this._isUserPresent(obj.commenterId) > 0) {
                        if (await this._isArticlePresent(obj.articleId)) {
                            obj.id = (Math.random() * 90 + 100).toFixed(4);
                            const commentsDetails = Object.assign({_id: obj.id}, obj);
                            const commentsCollection = this.db.collection('comments');
                            await commentsCollection.insertOne(commentsDetails);
                            this.db.collection(category).createIndex(this.indexing);
                        } else {
                            throw [new BlogError('BAD_ID', `Invalid id ${obj.articleId} for articles for create comments`)]
                        }
                    } else {
                        throw [new BlogError('BAD_ID', `Invalid id ${obj.authorId} for users for create comments`)]
                    }
                }
            } else {
                throw [new BlogError('DB_NOT_CONNECTED', 'Please check database connection')]
            }
        } else {
            throw [new BlogError('BAD_FIELD',
                `the internal mongo _id field is forbidden for ${category} create`)]
        }
        //await this.client.close();
    return obj.id
    }

    /** Find blog objects from category which meets findSpec.
     *
     *  First returned result will be at offset findSpec._index (default
     *  0) within all the results which meet findSpec.  Returns list
     *  containing up to findSpecs._count (default DEFAULT_COUNT)
     *  matching objects (empty list if no matching objects).  _count .
     *
     *  The _index and _count specs allow paging through results:  For
     *  example, to page through results 10 at a time:
     *    find() 1: _index 0, _count 10
     *    find() 2: _index 10, _count 10
     *    find() 3: _index 20, _count 10
     *    ...
     *
     */
    async find(category, findSpecs = {}) {
        const obj = this.validator.validate(category, 'find', findSpecs);
        //@TODO
        let data;
        let count = findSpecs._count || DEFAULT_COUNT;
        let index = findSpecs._index || DEFAULT_PAGING_COUNT;
        let findData = Object.assign({}, findSpecs);
        findData.creationTime = { "$lte": obj.creationTime };
        if (findSpecs.id !== undefined){
            findData._id = findSpecs.id
        }
        delete findData._count;
        delete findData._index;
        data = await this.db.collection(category).find(findData)
            .sort( { creationTime: -1 } )
            .skip(Number(index))
            .limit(Number(count))
            .project({_id: 0})
            .toArray();
        return data;
    }

    /** Remove up to one blog object from category with id == rmSpecs.id. */
    async remove(category, rmSpecs) {
        const obj = this.validator.validate(category, 'remove', rmSpecs);
        //@TODO
        const errors = [];
        const dataToRemove = await this._findById(category, rmSpecs);
        if (dataToRemove.length === 0) {
            const msg = `no ${category} for id ${rmSpecs.id} in remove`;
            throw [new BlogError('BAD_ID', msg)];
        }
        if (category === "users"){
            const findDataIn = {articles: 'authorId', comments: 'commenterId'};
            for (const [cat, field] of Object.entries(findDataIn)){
                const dataForUser = await this.db.collection(cat)
                    .find({ [field]: dataToRemove[0].id}).toArray();
                if(dataForUser.length > 0){
                    const msg = `${category} ${obj.id} referenced by ${field} ` +
                        `for ${cat} ` + dataForUser.map(c => c['id']);
                    errors.push(new BlogError('BAD_ID', msg));
                }
            }
            if(errors.length > 0) throw errors;
            await this._deleteById(category, rmSpecs);
        }
        else if(category === "articles"){
            const field = "articleId";
            const commentForArticles = await this.db.collection('comments')
                .find({[field]: dataToRemove[0].id}).toArray();
            if(commentForArticles.length > 0){
                const msg = `${category} ${obj.id} referenced by ${field} ` +
                    `for comments ` + commentForArticles.map(c => c['id']);
                errors.push(new BlogError('BAD_ID', msg));
            }
            if(errors.length > 0) throw errors;
            await this._deleteById(category, rmSpecs);
        }
        else if(category === "comments"){
            await this._deleteById(category, rmSpecs);
        }
    }

    /** Update blog object updateSpecs.id from category as per
     *  updateSpecs.
     */
    async update(category, updateSpecs) {
        const obj = this.validator.validate(category, 'update', updateSpecs);
        //@TODO
        let dataToUpdate = Object.assign(obj);
        delete dataToUpdate.id;
        const update = {"$set" : dataToUpdate};
        const ret = await this.db.collection(category)
            .findOneAndUpdate({_id: updateSpecs.id}, update, {returnOriginal:false});
        assert(ret.value._id === updateSpecs.id)
    }

    _isUserPresent(id){
        return this.db.collection('users').find({_id: id}).count()
    }
    _isArticlePresent(articleId){
        return this.db.collection('articles').find({_id: articleId}).count()
    }
    _isConnected(){
        return (this.db.serverConfig).isConnected();
    }
    _findById(category, removeSpecs){
        return this.db.collection(category).find({_id: removeSpecs.id}).toArray()
    }
    _deleteById(category, deleteSpecs){
        return this.db.collection(category).deleteOne({_id: deleteSpecs.id})
    }
}

const DEFAULT_COUNT = 5;
const DEFAULT_PAGING_COUNT = 0;
const MONGO_CONNECT_OPTIONS = {
    useUnifiedTopology: true,
    useNewUrlParser: true
};
const COLLECTIONS = ['users', 'articles', 'comments'];
