class RPC_Buddy
{
  constructor(express_app, server_url, client_url)
  {
    express_app.post(server_url, this.Server);
    express_app.get(client_url, this.Client);
  }

  Client(req, res)
  {
    res.send('Client');
  }

  Server(req, res)
  {
    res.send('Server');
  }
}

module.exports = RPC_Buddy;