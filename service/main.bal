import ballerina/http;

service / on new http:Listener(8080) {
    resource function get whoami(http:Request req) returns json {
        map<string> headers = {};
        foreach var name in req.getHeaderNames() {
            var value = req.getHeader(name);
            if value is string {
                headers[name] = value;
            }
        }
        return { headers };
    }
}
