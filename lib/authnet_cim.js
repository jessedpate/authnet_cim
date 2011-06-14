require.paths.unshift(__dirname);

var EventEmitter = require('events').EventEmitter;
var queryString = require('querystring'), requestFormats = require('request-formats');
var crypto = require('crypto'), https = require('https');
var xml2js = require('xml2js');

var host = {
	sandbox: 'apitest.authorize.net',
	live: 'api.authorize.net'
};


exports.createConnection = function(options) {
	var connection = new AuthorizenetCIMClient({
		host: host[options.host],
		path: '/xml/v1/request.api',
		contentType: 'text/xml'
	}, options.auth);

	return new Client(options, connection);
};

var AuthorizenetCIMClient = function(options, auth) {
	this.request = function(request, callback) {
		var requestString = queryString.stringify(request);
		var req = https.request({
			host: options.host,
			path: options.path,
			method: 'POST',
			headers: {
				'Content-Length': request.length,
				'Content-Type': options.contentType
			}
		});
console.log(request);
		req.write(request);
		req.on('error', function() {});
		
		req.on('response', function(res) {
			res.on('data', function(data) {
				var parser = new xml2js.Parser(), response;
				data = data.toString();
				
				parser.addListener('end', function(result) {
					callback(result);
				});
				
				parser.parseString(data);
			});
		});

		req.end();
	}
};

var Client = function(options, client) {
    var methods = {}, id = false, key = false;

    methods.createCustomerProfile = function(request) {
        // Pg 21 of merchant service API guide
        if(!request.merchantCustomerId && !request.description && !request.email) return false;
        return requestFormats.createCustomerProfile(request);
    }; 
    methods.createCustomerPaymentProfile = function(request) {
        // Pg 27 of merchant service API guide
        return requestFormats.createCustomerPaymentProfile(request);
    };
    methods.createCustomerShippingAddress = function(request) {
        // Pg 31 of merchant service API guide
        return requestFormats.createCustomerShippingAddress(request);
    };
    methods.createCustomerProfileTransaction = function(request) {
        // Pg 33 of merchant service API guide
        return requestFormats.createCustomerProfileTransaction(request);
    };
    
    methods.deleteCustomerProfile = function(request) {
        // Pg 68 of merchant service API guide
        return requestFormats.deleteCustomerProfile(request);
    };
    methods.deleteCustomerPaymentProfile = function(request) {
        // Pg 69 of merchant service API guide
        return requestFormats.deleteCustomerPaymentProfile(request);
    };
    methods.deleteCustomerShippingAddress = function(request) {
        // Pg 70 of merchant service API guide
        return requestFormats.deleteCustomerShippingAddress(request);
    };

    methods.getCustomerProfile = function(request) {
        // Pg 71 of merchant service API guide
        return requestFormats.getCustomerProfile(request);
    };
    methods.getCustomerPaymentProfile = function(request) {
        // Pg 72 of merchant service API guide
        return requestFormats.getCustomerPaymentProfile(request);
    };
    methods.getCustomerShippingAddress = function(request) {
        // Pg 73 of merchant service API guide
        return requestFormats.getCustomerShippingAddress(request);
    };

    methods.updateCustomerProfile = function(request) {
        // Pg 75 of merchant service API guide
        return requestFormats.updateCustomerProfile(request);
    };
    methods.updateCustomerPaymentProfile = function(request) {
        // Pg 76 of merchant service API guide
        return requestFormats.updateCustomerPaymentProfile(request);
    };
    methods.updateCustomerShippingAddress = function(request) {
        // Pg 82 of merchant service API guide
        return requestFormats.updateCustomerShippingAddress(request);
    };

    this.setLoginDetails = function(loginId, transKey) {
        id = loginId;
        key = transKey;
    };

    this.request = function(type, request) {
        var body = false, content = false;
        var emitter = new EventEmitter();

        if(!id || !key) throw new Error('Login ID or Transaction Key missing.');

        content = methods[type](request);

        if(type in methods && content) {
            body = requestFormats.body({
                requestType: type,
                login: id,
                transactionKey: key,
                content: content
            });
        }
		
		//Temp for debugging
        //console.log(body.replace(/>/g, '>\n').replace(/</g, '\n<'));
		
        if(body) {
            client.request(body, function(response) {
                if(response.messages.resultCode == 'Error') {
					response.code = response.messages.message.code;
					if(response.directResponse) {
						var dr = response.directResponse.split(',');
						response.response_code = dr[0];
						response.response_subcode = dr[1];
						response.reason_code = dr[2];
						response.response_reason = dr[3];
						response.auth_code = dr[4];
						response.avs = dr[5];
						response.transaction_id = dr[6];
					}

					emitter.emit('failure', response);
				}
				else {
					response.code = response.messages.message.code;
					if(response.directResponse) {
						var dr = response.directResponse.split(',');
						response.response_code = dr[0];
						response.response_subcode = dr[1];
						response.reason_code = dr[2];
						response.response_reason = dr[3];
						response.auth_code = dr[4];
						response.avs = dr[5];
						response.transaction_id = dr[6];
						
						if(response.response_code == 1) {
							emitter.emit('success', response);
						}
						else {
							emitter.emit('failure', response);
						}
					}
					else {
						emitter.emit('success', response);
					}
				}
            });

            return emitter;
        }
        else {
            setTimeout(function() {
                emitter.emit('error', 'Invalid request');
            }, 10);
            
            return emitter;
        }
    };
};