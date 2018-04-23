let url = "mongodb://botscript:botscriptdb123@52.226.73.198:6599/admin";
const uuidv4 = require('uuid/v4');

const MongoClient = require('mongodb').MongoClient;

async function addUser(user, database) {
    const client = await MongoClient.connect(url);
    const db = await client.db(database);
    let password = uuidv4();
    try {
        let response = await db.command({
            updateUser: user,
            pwd: password
        });
        console.log('Changed password to ' + password);
        return password;
    } 
    catch (error) {
        console.log(error);
    }
    
    try 
    {
        const response = await db.addUser(user, password, {
            roles: [
                {
                    role : "dbOwner",
                    db   : database
                }
            ]
        });
        return password;  
    }
    
    catch (error) 
    {
        console.log(error);
        return null;    
    }
}

module.exports = addUser;