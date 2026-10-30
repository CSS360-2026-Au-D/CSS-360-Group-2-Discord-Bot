var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var loadEvents_exports = {};
__export(loadEvents_exports, {
  default: () => loadEvents
});
module.exports = __toCommonJS(loadEvents_exports);
var import_loadFiles = __toESM(require("./loadFiles"));
var import_ascii_table = __toESM(require("ascii-table"));
var import_path = __toESM(require("path"));
function loadEvents(client, dirName) {
  client.events.clear();
  const files = (0, import_loadFiles.default)(dirName, ".js");
  const table = new import_ascii_table.default("Events").setHeading("Event", "Status");
  for (const file of files) {
    const event = require(import_path.default.join(dirName, file)).default;
    const execute = (...args) => event.execute(...args, client);
    client.events.set(event.name, execute);
    if (event.rest) {
      if (event.once) client.rest.once(event.name, execute);
      else client.rest.on(event.name, execute);
    } else {
      if (event.once) client.once(event.name, execute);
      else client.on(event.name, execute);
    }
    table.addRow(file, "\u2705");
  }
  console.log(table.toString());
}
