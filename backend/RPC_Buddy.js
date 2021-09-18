
class RPC_Buddy
{
  constructor(express_app, server_url, client_url, class_instances, fns, client_type)
  {
    this.class_instances = class_instances;
    this.fns = fns;
    this.Client_Express = this.Client_Express.bind(this);
    this.Client_Koa = this.Client_Koa.bind(this);
    this.Server_Express = this.Server_Express.bind(this);
    this.Server_Koa = this.Server_Koa.bind(this);

    if (client_type == "koa")
    {
      express_app.post(server_url, this.Server_Koa);
      express_app.get(client_url, this.Client_Koa);
    }
    else
    {
      express_app.post(server_url, this.Server_Express);
      express_app.get(client_url, this.Client_Express);
    }
  }

  Client(req)
  {
    const class_name = req.query.class;
    const server_host = req.query.serverHost || "";

    //const class_instance = this.class_instances.find(c => c.name == class_name);
    const class_fns = this.fns.filter(fn => fn.name.split(".")[0] == class_name);
    const fn_names = class_fns.map(fn => fn.name.split(".")[1]);
    const fn_bodies = fn_names.map(fn_name => `
      static ${fn_name}()
      {
        return ${class_name}.Fetch_RPC("${class_name}.${fn_name}", arguments);
      }
    `);

    const class_def = `
      class ${class_name}
      {
        ${fn_bodies.join("\n")}

        static async Fetch_RPC(method, method_params)
        {
          let params = {}, param_id = 1;
          for (const method_param of method_params)
          {
            params["p" + param_id] = method_param;
            param_id++;
          }

          const body =
          {
            jsonrpc: "2.0",
            method,
            params,
            id: Date.now()
          };
          const server_host = ${class_name}.server_host || "${server_host}";
          const http_res = await fetch(server_host + "/rpc-server", 
          {
            method: "post", 
            headers: 
            {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          });
          ${class_name}.status = http_res.status;
          const http_json = await http_res.json();

          return http_json.result;
        }
      }

      export default ${class_name};
    `;

    return class_def;
  }

  Client_Koa(ctx)
  {
    const class_def = this.Client(ctx);

    ctx.set("Content-Type", "text/javascript");
    ctx.body = class_def;
  }

  Client_Express(req, res)
  {
    const class_def = this.Client(req);

    res.set("Content-Type", "text/javascript");
    res.send(class_def);
  }

  async Server(req_rpc)
  {
    const fn = this.Get_Fn(req_rpc.method);
    const params_array = this.Get_Params(req_rpc);
    const res_fn = await fn(...params_array);

    const res_rpc = 
    {
      jsonrpc: "2.0",
      result: res_fn,
      id: req_rpc.id,
      error: null
    };
    
    return res_rpc;
  }

  async Server_Express(req, res)
  {
    const res_rpc = await this.Server(req.body);
    res.json(res_rpc);
  }

  async Server_Koa(ctx)
  {
    const res_rpc = await this.Server(ctx.request.body);
    ctx.body = res_rpc;
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

  Get_Params(req_rpc)
  {
    const res = RPC_Buddy.To_Array(req_rpc.params);

    const fn = this.fns.find(fn => fn.name == req_rpc.method);
    if (fn.inject)
    {
      res.unshift(...fn.inject);
    }

    return res;
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