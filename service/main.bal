import ballerina/http;
import ballerina/jwt;

service / on new http:Listener(8080) {
    resource function get whoami(http:Request req) returns json {
        map<string> headers = {};
        foreach string name in req.getHeaderNames() {
            string|error value = req.getHeader(name);
            if value is string {
                headers[name] = value;
            }
        }

        json user = {authenticated: false};
        string? assertion = headers["x-jwt-assertion"];
        if assertion is string {
            [jwt:Header, jwt:Payload]|jwt:Error decoded = jwt:decode(assertion);
            if decoded is [jwt:Header, jwt:Payload] {
                jwt:Payload payload = decoded[1];
                anydata scopeClaim = payload["scope"];
                anydata clientClaim = payload["client_id"];
                user = {
                    authenticated: true,
                    sub: payload.sub ?: "",
                    scopes: scopeClaim is string ? scopeClaim : "",
                    clientId: clientClaim is string ? clientClaim : ""
                };
            }
        }

        return {user, headers};
    }
}
