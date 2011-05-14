var xml2js = require('xml2js');

var parser = new xml2js.Parser();
parser.addListener('end', function(result) {
    console.log(sys.inspect(result));
    console.log('Done.');
});

exports.parseResponse = function(request, response){
  var result = {}
  console.log(response);
  parser.parseString(response);
/*  response.split('|').forEach(function(value, index){
    var key = fieldDefinitions[index]
    if(key != undefined)
      result[key] = value
  })*/
  
  return response;
}
