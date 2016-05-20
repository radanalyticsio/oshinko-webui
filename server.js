var express = require("express");

var app = express();
app.use(express.logger());

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/app');
    //app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/app'));
    app.use(app.router);
    app.engine('html', require('ejs').renderFile);
});

app.get('/', function(request, response) {
    response.render('index.html')
});

var oshinko_rest_location = process.env.OPENSHIFT_OSHINKO_REST || 'http://10.16.40.63/';
app.get('/oshinko-rest-location', function(request, response) {
    response.send(oshinko_rest_location)
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(port, function() {
    console.log("Listening on " + port);
});
