var express = require('express');
var morgan = require('morgan');
var open = require("open");

var app = express();

app.use(morgan('dev'));
app.use(express.static("" + __dirname + "/app"));
app.listen(process.env.PORT || 5000);

open("http://localhost:5000/");

