const express = require('express');
const RPC_Buddy = require('./RPC_Buddy');

const app = express();
const port = 80;
const rpc_buddy = new RPC_Buddy(app, '/rpc-server', '/rpc-client');

app.use(express.static('frontend'));

app.listen(port, Listen);
function Listen()
{
  console.log(`RPC Buddy listening at http://localhost:${port}`);
}