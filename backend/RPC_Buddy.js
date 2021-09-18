
class RPC_Buddy
{
  constructor(express_app, server_url, client_url, class_instances)
  {
    this.class_instances = class_instances;
    this.Server = this.Server.bind(this);

    express_app.post(server_url, this.Server);
    express_app.get(client_url, this.Client);
  }

  Client(req, res)
  {
    res.send('Client');
  }

  Server(req, res)
  {
    const g = module;
    const req_rpc = req.body;

    const fn = this.Get_Fn(req_rpc.method);
    const params_array = RPC_Buddy.To_Array(req_rpc.params);
    const res_fn = fn(...params_array);

    const res_rpc = 
    {
      jsonrpc: "2.0",
      result: res_fn,
      id: req_rpc.id,
      error: null
    };
    res.json(res_rpc);
  }

  Get_Fn(fn_namespace)
  {
    const name_tokens = fn_namespace.split(".");
    const fn_class = name_tokens[0];
    const fn_name = name_tokens[1];

    const class_instance = this.class_instances.find(c => c.name == fn_class);
    const fn = class_instance[fn_name];

    return fn;
  }

  static To_Array(obj)
  {
    const res = [];

    for (const key in obj)
    {
      res.push(obj[key]);
    }

    return res;
  }
}

module.exports = RPC_Buddy;