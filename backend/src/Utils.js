
class Utils
{
  static isEmpty(items)
  {
    let res = false;
    const typeOfItems = typeof items;

    if (items == null || items == undefined)
    {
      res = true;
    }
    else if (Array.isArray(items))
    {
      if (items.length == 0)
      {
        res = true;
      }
    }
    else if (typeOfItems == "string")
    {
      const str = items.trim();
      if (str.length == 0 || str == "")
      {
        res = true;
      }
    }
    else if (typeOfItems == "object")
    {
      res = Utils.isEmptyObj(items);
    }

    return res;
  }
}

module.exports = Utils;