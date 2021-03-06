/*
 * library to make API calls to a BIG-IP
 *
 */

var Client = require('node-rest-client').Client;
var winston = require('winston');
 
winston.level = 'notice';
var exports = module.exports = {};

//ignore self signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// set API authentication 
var options_auth = {
  user: "admin", 
  password: "admin"
};

/**
 * delete key:data pair from the data group
 *
 * @param {String} url
 * @param {String} request arguments
 * @param {String} data
 * @param {Function} callback
 *
 * @todo abstract this so it can handle any response from API
 */

 exports.delete = function(url, args, data, callback) {
 	// get the data set so we can work with it
 	exports.get(url, args, function(res) {
 		// check if the object exists
 		if(typeof res.addresses != 'undefined') {
 			var exists = false;
 			for (var address in res.addresses) {
 				if(res.addresses[address].name == data) {
 					winston.log('debug', 'DELETE: address found, deleting it');
 					res.addresses.splice(address, address+1);
 					exists = true;
 					break;
 				}
 			}
 			// only udpate address list if the address exists
 			if(exists) {
 				// populate the arguments for the http post 
		      args = {  
		        data: { addresses: res.addresses },
		        headers: { "Content-Type": "application/json" }
		      };
		      exports.putRequest(url, args, function (r) {
		        callback(r);
		      });
 			}
 		}
 	});
 };

/**
 * handle API GET requets
 *
 * @param {String} url
 * @param {Ojbect} args
 * @param {Function} callback
 */
exports.get = function(url, args, callback) {    
  winston.log('debug', 'GET: url: ', url);
  
  // create new node-rest-client object
  var client = new Client(options_auth);
  
  // make a get request
  client.get(url, args, function(data, response) {
	winston.log('debug', 'GET: data: ', data.addresses);
    
    // function is async - so we need to use a callback
    callback(data);      
  }).on('error', function (err) {
  	console.log('something went wrong on the request', err.request.options);
  });

  client.on('error', function (err) {
 	console.error('Something went wrong on the client', err);
  });
};

/**
 * add key:data pair to the data group
 *
 * @param {String} url
 * @param {String} request arguments
 * @param {String} data
 * @param {Function} callback
 *
 * @todo abstract this so it can handle any response from API
 */
exports.put = function (url, args, data, callback) {
  // get the data set so we can work with it
  exports.get(url, args, function(res) {
  		winston.log('debug', 'PUT: addresses: ', res.addresses);
      // check if the object exists 
      if (typeof res.addresses != 'undefined') {
        // make sure address doesn't already exist
        var isset = false;
        for(var address in res.addresses) {
        	winston.log('debug', 'PUT: for loop address: ', res.addresses[address].name);
          if(res.addresses[address].name == data) {
            // address exists, update secret
            winston.log('debug', 'PUT: for loop address exists, replacing it');
            res.addresses[address].name = data;
            isset = true;
            break;
          }
        }
        if(!isset) {
          // address doesn't exist, add them
          winston.log('debug', 'PUT: adding address: ', data);
          res.addresses.push({"name": data});
        }
      } else {
      	winston.log('debug', 'PUT: creating address list: ', data);
        res.addresses = [{"name": data}];
      }

      // populate the arguments for the http post 
      args = {  
        data: { addresses: res.addresses },
        headers: { "Content-Type": "application/json" }
      };
      exports.putRequest(url, args, function (r) {
        callback(r);
      });
    });
};
 
/**
 * send PUT request to data group API
 *
 * @param {String} url
 * @param {Array} args
 * @param {Function} callback
 */ 
exports.putRequest = function(url, args, callback) {
  var client = new Client(options_auth);
  var req = client.put(url, args, function(data, response) {
    callback(data);
  });
  req.on('requestTimeout', function (req) {
    console.log('request has expired');
  });
  req.on('responseTimeout', function (res) {
    console.log('response has expired');
  });
  req.on('error', function(err) {
    console.log('request error', err);
  });
};
