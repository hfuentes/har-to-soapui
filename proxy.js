'use strict';

const fs = require('fs');
const builder = require('xmlbuilder');
const crypto = require('crypto');

//read json data from har file
console.info('reading har file ...');

let xhrData = JSON.parse(fs.readFileSync('portalcomercial.har', 'utf8')).log.entries.filter((item) => {
	cleanXHRData(item);
	return item['_resourceType'] == 'xhr';
});

console.log(xhrData.length + ' xhr entries in har file ...');

//build xml soapui structure from json har file
console.log('building xml soapui file ...');
let xmlString = buildXML(xhrData);

console.log('writing xml soapui file ...');
fs.writeFileSync('test.xml', xmlString);

console.log('finished!');

//functions

//get hex format
function getHexId() {
	return crypto.randomBytes(4).toString('hex') + '-' +
		crypto.randomBytes(2).toString('hex') + '-' +
		crypto.randomBytes(2).toString('hex') + '-' +
		crypto.randomBytes(2).toString('hex') + '-' +
		crypto.randomBytes(6).toString('hex');
};

//clean trash data into xhr object
function cleanXHRData(item) {
	delete item.request.headers;
	delete item.request.cookies;
	delete item.request.httpVersion;
	delete item.request.queryString;
	delete item.request.headersSize;
	delete item.request.bodySize;
	delete item.cache;
	delete item.timings;
	delete item.serverIPAddress;
	delete item['_initiator'];
	delete item['_priority'];
	delete item.connection;
	delete item.pageref;
	delete item.startedDateTime;
	delete item.time;
	delete item.response.cookies;
	delete item.response['_transferSize'];
	delete item.response.redirectURL;
	delete item.response.headersSize;
	delete item.response.bodySize;
	delete item.response.httpVersion;
	delete item.response.statusText;
	delete item.response.headers;
	delete item.response.content.size;
	delete item.response.content.compression;
	delete item.response.content['_resourceType'];
};

//format url to soapiu structure
function formatURL(url) {
	let list = url.replace(/^http([s]?):\/\//i, '').split('/');
	list.shift();
	return '/' + list.join('/');
}

//build xml strcture from har file to soapui format
function buildXML(xhrData) {
	var xml = builder.create('con:soapui-project', {version: '1.0', encoding: 'UTF-8'})
		.att('id', getHexId())
		.att('activeEnvironment', 'Default')
		.att('name', 'MOCK - HAR File')
		.att('resourceRoot', '${projectDir}')
		.att('soapui-version', '5.5.0')
		.att('abortOnError', 'false')
		.att('runType', 'SEQUENTIAL')
		.att('xmlns:con', 'http://eviware.com/soapui/config');

	xml.ele('con:settings');

	let serv = xml.ele('con:restMockService', {
		'id': getHexId(),
		'port': '1111',
		'path': '/',
		'host': 'localhost',
		'name': 'HectorMock',
		'docroot': ''
	});

	serv.ele('con:settings');
	serv.ele('con:properties');

	for (var i = 0, len = xhrData.length; i < len; i++) {
		let data = xhrData[i];

		let mock = serv.ele('con:restMockAction', {
			'name': formatURL(data.request.url),
			'method': data.request.method,
			'resourcePath': formatURL(data.request.url),
			'id': getHexId()
		});

		mock.ele('con:settings');
		mock.ele('con:defaultResponse', {}, 'rs');
		mock.ele('con:dispatchStyle', {}, 'SEQUENCE');
		mock.ele('con:dispatchPath');

		let mockResponse = mock.ele('con:response', {
			'name': 'rs',
			'id': getHexId(),
			'httpResponseStatus': data.response.status,
			'mediaType': data.response.content.mimeType
		});

		mockResponse.ele('con:settings');
		mockResponse.ele('con:responseContent', {}, data.response.content.text);
	}

	xml.ele('con:properties');
	xml.ele('con:wssContainer');
	xml.ele('con:oAuth2ProfileContainer');
	xml.ele('con:oAuth1ProfileContainer');
	xml.ele('con:sensitiveInformation');

	return xml.end({ pretty: true})
};