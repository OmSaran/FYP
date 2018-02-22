const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = "mongodb://localhost:27017/";
const dbName = "FYP";
var semaphore = require('semaphore')
var semaphores = {}

var utils = {
    
    client: undefined,

    addValues: async function (CollectionName, values) {
        try {
            if (this.client == undefined)
                this.client = await MongoClient.connect(url);
            
            if(semaphores[values['user']] == undefined)
                semaphores[values['user']] = semaphore(1);
            
            let client = this.client;

            semaphores[values['user']].take(async function(){
                const db = client.db(dbName);
                const col = db.collection(CollectionName);
                let count = await col.count({'user': values['user']});
                values['index'] = count + 1;
                let r = await db.collection(CollectionName).insertOne(values);
                assert.equal(1, r.insertedCount);
                semaphores[values['user']].leave();
            }); 
            //return done
        }
        catch (err) {
            console.log(err.stack);
            //return error
        }
    },

    getColumns: async function (CollectionName, filter, columns) {
        try {
            if (this.client == undefined)
                this.client = await MongoClient.connect(url);
            var coloumnSelected = {'_id': 0}
            for (let i = 0;i < columns.length; i++) {
                coloumnSelected[columns[i]] = 1;
            }
            const db = this.client.db(dbName);
            const col = db.collection(CollectionName);
            data = await col.find(filter).project(coloumnSelected).toArray();
            return data

        }
        catch (err) {
            console.log(err.stack);
        }
    },

    updateValues: async function (CollectionName, values, filter) {
        try {
            if (this.client == undefined)
                this.client = await MongoClient.connect(url);
            const db = this.client.db(dbName);
            const col = db.collection(CollectionName);
            data = await col.findOneAndUpdate(filter, { $set: values });

        }
        catch (err) {
            console.log(err.stack);
        }
    },

    deleteValues: async function (CollectionName, values, filter) {
        try {
            if (this.client == undefined)
                this.client = await MongoClient.connect(url);
            const db = this.client.db(dbName);
            const col = db.collection(CollectionName);
            data = await col.findOneAndDelete(values);
        }
        catch (err) {
            console.log(err.stack);
        }
    }
}

module.exports = utils;