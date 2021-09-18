# rpc-buddy
RPC Buddy allows developers to automatically expose back-end Javascript methods for use by browser frontend code.

## Never again write a single line of "fetch" code!!
Attach this single class to your Express setup, specify which classes and methods to expose and BAM!
Your methods are accessible! 
On the frontend just import a dynamically generated client and start making direct identical calls to your methods.

## An Example
Say you have a backend class like so:
```javascript
class someClass
{
  static someFunction(p1, p2, p3)
  {
    return p1 + ", " + p2 + ", " + p3;
  }
}
```

Integrate with Express and specify which methods to expose like so:
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

In your browser code you can, straight away, make backend calls like so:
```javascript
import someClass from "/clientUrl?class=someClass";

window.onload = main;
async function main()
{
  const res = await someClass.someFunction("one", "two", "three");
  alert(res); // will show "one, two, three"
}
```

## To Do
- Error Handling
- Authentication
