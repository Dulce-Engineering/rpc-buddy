# RPC Buddy
RPC Buddy allows me to automatically expose back-end Javascript methods for use by browser frontend code.

## Never again do I have to write a single line of "fetch" code!!
I attach this single class to my Express setup, specify which classes and methods to expose and BAM!
My methods are accessible! 
On the frontend, I just import a dynamically generated client and start making direct identical calls to my methods.

## An Example
Say I have a backend class like so:
```javascript
class someClass
{
  static someFunction(p1, p2, p3)
  {
    return p1 + ", " + p2 + ", " + p3;
  }
}
```

I integrate RPC Buddy with Express and specify which methods to expose like so:
```javascript
const rpcBuddy = require('./RPC_Buddy');
const someClass = require('./someClass');

new rpcBuddy
(
  expressApp, 
  '/serverUrl', '/clientUrl', // backend endpoints
  [someClass], // classes to expose
  [{name: "someClass.someFunction"}] // class methods to expose
);
```

In my browser code I can, straight away, make backend calls like so:
```javascript
import someClass from "/clientUrl?class=someClass";

window.onload = main;
async function main()
{
  const res = await someClass.someFunction("one", "two", "three");
  alert(res); // will show "one, two, three"
}
```

## Client URL Options
- noexport: When specified, the resulting code does not export the defined classes. They are, instead, avilable globally.
- class=class_name: When specified, only code for a single class is generated.
- serverHost=url: When specified, all http request URLs are prepended with the given value.

## Client Class Fields
- headers Object: When specified, all given headers are applied to all HTTP requests for the class.
- On_Fetch Function(url, options, http_res): When specified, all "fetch" results are passed to given function.
- last_rpc_raw String: Raw text received from last RPC request.
- last_rpc Object: JSON object received from last RPC request.

## Server Constructor Options
to do
## Server Method Options
- name String: Name of method to expose including class name.
- inject [Object]: Objects to inject at start of method parameters.
- On_Post_Server Function: Function to execute when a method is invoked.
- middleware [Function]: Functions to include as URL middleware.