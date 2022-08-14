
class RPC_Buddy
{
  constructor(express_app, server_url, client_url, class_instances, fns)
  {
    this.class_instances = class_instances;
    this.fns = fns;
    this.Client = this.Client.bind(this);
    this.Server = this.Server.bind(this);
    this.client_cache_control = "max-age=3600";

    express_app.post(server_url, this.Server);
    express_app.get(client_url, this.Client);
  }

  Client(req, res)
  {
    const class_name = req.query.class;

    //const class_instance = this.class_instances.find(c => c.name == class_name);
    const class_fns = this.fns.filter(fn => fn.split(".")[0] == class_name);
    const fn_names = class_fns.map(fn => fn.split(".")[1]);
    const fn_bodies = fn_names.map(fn_name => `
      static ${fn_name}()
      {
        return Class_Def.Fetch_RPC("${class_name}.${fn_name}", arguments);
      }
    `);

    const class_def = `
      class Class_Def
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
          const http_res = await fetch("rpc-server", 
          {
            method: "post", 
            headers: 
            {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          });
          const http_json = await http_res.json();

          return http_json.result;
        }
      }

      export default Class_Def;
    `;

    res.set("Content-Type", "text/javascript");
    res.set("Cache-Control", this.client_cache_control);
    res.send(class_def);
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