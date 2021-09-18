const express = require('express');
const RPC_Buddy = require('./RPC_Buddy');
const Sample_Class = require('./Sample_Class');

const app = express();
app.use(express.json());
app.use(express.static('frontend'));

const rpc_buddy = new RPC_Buddy
(
  app, 
  '/rpc-server', 
  '/rpc-client',
  [Sample_Class],
  ["Sample_Class.someFunction", "Sample_Class.Another_Function"]
);

const port = 80;
app.listen(port, Listen);
function Listen()
{
  console.log(`RPC Buddy listening at http://localhost:${port}`);
}