const Utils = require("./Utils");

class RPC_Buddy
{
  constructor(app, server_url, client_url, class_instances, fns, client_type, on_error_fn)
  {
    this.class_instances = class_instances;
    this.fns = fns;
    this.on_error_fn = on_error_fn;
    this.server_url = server_url;
    this.client_cache_control = "max-age=3600";

    const app_handler = new client_type(this, app);
    app_handler.rpc_buddy = this;
    this.Set_Routes(app_handler, server_url, client_url);
  }

  Set_Routes(app_handler, server_url, client_url)
  {
    app_handler.Set_Client_Route(client_url);

    for (const fn of this.fns)
    {
      const fn_url = this.Get_Fn_URL(server_url, fn);
      const fn_middleware = fn.middleware;
      app_handler.Set_Server_Route(fn_url, fn_middleware);
    }
  }

  Client(server_host, class_name, noexport)
  {
    let class_def;

    if (class_name)
    {
      class_def = this.Client_Class(class_name, server_host);
      if (noexport == undefined)
      {
        class_def += `export default ${class_name};`;
      }
    }
    else
    {
      const class_defs = this.class_instances.map(c => this.Client_Class(c.name, server_host));
      class_def = class_defs.join("");

      const class_names = this.class_instances.map(c => c.name);
      const class_names_str = class_names.join(", ");

      if (noexport == undefined)
      {
        class_def += `export default {${class_names_str}};`;
      }
      else
      {
        class_def += `const rpc_classes = [${class_names_str}];`;
      }
    }

    return class_def;
  }

  Client_Class(class_name, server_host)
  {
    const class_fns = this.fns.filter(fn => fn.name.split(".")[0] == class_name);
    if (!server_host)
    {
      server_host = "";
    }
    const fn_bodies = class_fns.map(fn => `
      static ${fn.name.split(".")[1]}()
      {
        const method = "${fn.name}";
        const server_host = ${class_name}.server_host || "${server_host}";
        const url = server_host + "${this.Get_Fn_URL(this.server_url, fn)}";
        return ${class_name}.Fetch_RPC(url, method, arguments);
      }
    `);

    const class_def = `
      class ${class_name}
      {
        ${fn_bodies.join("\n")}

        static async Fetch_RPC(url, method, method_params)
        {
          let params = {}, param_id = 1, res = null;
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

          const options =
          {
            method: "post", 
            headers: 
            {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          };
          if (${class_name}.headers)
          {
            options.headers = {...options.headers, ...${class_name}.headers};
          }
          
          if (${class_name}.On_Pre_Fetch)
          {
            ${class_name}.On_Pre_Fetch(url, options);
          }
          const http_res = await fetch(url, options);
          ${class_name}.last_rpc_status = http_res.status;
          if (${class_name}.On_Fetch)
          {
            ${class_name}.On_Fetch(url, options, http_res);
          }
          const http_text = await http_res.text();
          if (http_text)
          {
            ${class_name}.last_rpc_raw = http_text;

            try 
            {
              const http_json = JSON.parse(http_text);
              ${class_name}.last_rpc = http_json;

              if (http_json.error)
              {
                if (${class_name}.On_Error)
                {
                  ${class_name}.On_Error(url, options, http_json);
                }
                else if (http_json.error.stack)
                {
                  console.error(http_json.error.stack);
                }
                else
                {
                  console.error(http_json.error.code + ": " + http_json.error.message);
                }
              }
              res = http_json.result;
            }
            catch(e) 
            {
              console.error(e);
            };
          }

          return res;
        }
      }
    `;

    return class_def;
  }

  Get_Fn_URL(server_url, fn)
  {
    /*let res;

    res = server_url;
    if (!Utils.isEmpty(fn.middleware))
    {
      res += "/" + fn.name;
    }

    return res;*/
    return server_url + "/" + fn.name;
  }

  async Server(req)
  {
    const req_rpc = req.body;
    let res_fn = null, error = null, fntime = null;

    const has_auth = await this.Has_Auth(req);
    if (has_auth)
    {
    const fn = this.Get_Fn(req_rpc.method);
    const params_array = await this.Get_Params(req);

    if (fn)
    {
      const start_time = process.hrtime.bigint();
      try
      {
        res_fn = await fn(...params_array);
      }
      catch (exception)
      {
        this.error = exception;
        error = 
        {
          code: exception.code || exception.name,
          message: exception.message,
          stack: exception.stack
        }
      }
      const duration = process.hrtime.bigint() - start_time;
      fntime = Number(duration/1000000n);
    }
    else
    {
        error = 
        {
          code: "RPC_ERROR_NOT_FOUND",
          message: "The method " + req_rpc.method + " was not found.",
        }
      }
    }
    else
    {
      error = 
      {
        code: "RPC_ERROR_NO_AUTH",
        message: "The method " + req_rpc.method + " requires authorisation.",
      }
    }

    const res_rpc = 
    {
      jsonrpc: "2.0",
      result: res_fn,
      id: req_rpc.id,
      error,
      fntime
    };
    
    return res_rpc;
  }

  async Has_Auth(req)
  {
    let res = true;
    const req_rpc = req.body;
    const fn = this.fns.find(fn => fn.name == req_rpc.method);

    if (fn?.on_auth_fn)
    {
      res = await fn.on_auth_fn(req);
    }

    return res;
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

  async Get_Params(req)
  {
    const req_rpc = req.body;
    const res = RPC_Buddy.To_Array(req_rpc.params);

    const fn = this.fns.find(fn => fn.name == req_rpc.method);
    if (fn.inject)
    {
      const inject_values = [];
      for (const inject_param of fn.inject)
      {
        let inject_value = inject_param;

        if (typeof inject_param == "function" && !inject_param.is_class)
        {
          inject_value = await inject_param(req);
        }

        inject_values.push(inject_value);
      }
      res.unshift(...inject_values);
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

class Koa
{
  constructor(rpc_buddy, app)
  {
    this.app = app;
    this.rpc_buddy = rpc_buddy;
    this.Get_Client = this.Get_Client.bind(this);
    this.Post_Server = this.Post_Server.bind(this);
  }

  Set_Client_Route(client_url)
  {
    this.app.get(client_url, this.Get_Client);
  }

  Set_Server_Route(fn_url, fn_middleware)
  {
    if (!Utils.isEmpty(fn_middleware))
    {
      this.app.post(fn_url, ...fn_middleware, this.Post_Server);
    }
    else
    {
      this.app.post(fn_url, this.Post_Server);
    }
  }

  Get_Client(ctx)
  {
    const class_def = this.rpc_buddy.Client
    (
      ctx.query.serverHost, 
      ctx.query.class, 
      ctx.query.noexport
    );

    ctx.set("Cache-Control", this.rpc_buddy.client_cache_control);
    ctx.set("Content-Type", "text/javascript");
    ctx.body = class_def;
  }

  async Post_Server(ctx)
  {
    const res_rpc = await this.rpc_buddy.Server(ctx.request);
    ctx.body = res_rpc;

    if (this.rpc_buddy.error)
    {
      if (this.rpc_buddy.on_error_fn)
      {
        await this.rpc_buddy.on_error_fn(this.rpc_buddy.error, ctx);
      }
      this.rpc_buddy.error = null;
    }
  }
}
RPC_Buddy.Koa = Koa;

class Express
{
  constructor(rpc_buddy, app)
  {
    this.app = app;
    this.rpc_buddy = rpc_buddy;
    this.Get_Client = this.Get_Client.bind(this);
    this.Post_Server = this.Post_Server.bind(this);
  }

  Set_Client_Route(client_url)
  {
    this.app.get(client_url, this.Get_Client);
  }

  Set_Server_Route(fn_url, fn_middleware)
  {
    this.app.post(fn_url, this.Post_Server);
  }

  Get_Client(req, res)
  {
    const class_def = this.rpc_buddy.Client
    (
      req.query.serverHost, 
      req.query.class, 
      req.query.noexport
    );

    res.set("Cache-Control", this.rpc_buddy.client_cache_control);
    res.set("Content-Type", "text/javascript");
    res.send(class_def);
  }

  async Post_Server(req, res, next)
  {
    const start_time = process.hrtime.bigint();
    let exec_method = true;

    const fn = this.rpc_buddy.fns.find(fn => fn.name == req.body.method);
    if (fn.On_Post_Server)
    {
      exec_method = fn.On_Post_Server(req, res, next);
    }

    if (exec_method)
    {
      const res_rpc = await this.rpc_buddy.Server(req);

      const duration = process.hrtime.bigint() - start_time;
      res_rpc.rpctime = Number(duration/1000000n);
      if (res_rpc.fntime != null)
      {
        res_rpc.rpctime = res_rpc.rpctime - res_rpc.fntime;
      }

      res.json(res_rpc);

      if (this.rpc_buddy.error)
      {
        if (this.rpc_buddy.on_error_fn)
        {
          this.rpc_buddy.on_error_fn(this.rpc_buddy.error, req, res, next);
        }
        this.rpc_buddy.error = null;
      }
    }
  }
}
RPC_Buddy.Express = Express;

module.exports = RPC_Buddy;