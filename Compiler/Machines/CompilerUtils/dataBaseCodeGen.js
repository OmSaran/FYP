module.exports = {
    generateJson: function (arr) {
        let json = '{';
        for (let i = 0; i < arr.length; ++i) {
            json = json + '"' + arr[i] + '": "" + data[this.uuid]["store"]["' + arr[i] + '"],';
        }
        json = json.substr(0, json.length - 1) + '}';
        json = json.replace('}', ', "user": this.uuid}');
        return json;
    },

    getUpdateCode: function (response) {
        let code = 'var rows = await dbUtils.getColumns("' + response['table'] + '", {"user": this.uuid}, []); let reply = "Here are your items, which one do you want to edit?"; for(let i = 0; i < rows.length; ++i) { let row = rows[i]; let index = row["index"]; delete row["index"]; reply += "\\n" + (index + ". " + JSON.stringify(row)); replier(this.uuid, reply);}';
        return code;
    },

    getStoreCode: function (response) {
        let columns = response['columns'];
        let json = generateJson(columns);
        return 'await dbUtils.addValues("' + response['table'] + '",' + json + ' );';
    },

    getTransitionCode: function (response, template) {
        let columns = response['columns'];
        let json = generateJson(columns);
        return template.replace('#code', 'await dbUtils.updateValues("' + response['table'] + '", ' + json + ', {"user": this.uuid, "index": index});')
    },

    getRetrieveCode: function (response) {
        let filters = Object.keys(response['filter']);
        let json = generateJson(filters);
        let code = 'let rows = await dbUtils.getColumns("' + response['table'] + '", ' + json + ', ' + '["' + response['columns'] + '"]); let template = "' + response['value'] + '"; let reply = ""; for(let i = 0; i < rows.length; ++i){ let temp = template; let row = rows[i]; let keys = Object.keys(row); for(let j = 0; j < keys.length; ++j){temp = temp.replace("@"+keys[j], row[keys[j]])} reply += temp;}\n replier(this.uuid, reply);';
        return code;
    }
}