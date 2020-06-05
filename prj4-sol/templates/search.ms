
<!DOCTYPE html>
<html>
  <head>
    <title>User Search</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body>
    <h1>Users Search</h1>
    {{#errors}}
        <div>
            <p class="error">{{.}}</p>
        </div>
    {{/errors}}
    <p>
      Please fill in one or more of the following fields
    </p>
    <form method="GET" action="/search/users">
        {{#fields}}
            <label for="{{name}}">{{friendlyName}}</label>
            <div>
                <input name="{{name}}" id="{{name}}" value="{{value}}">
                <div class="error" id="{{name}}">{{errorMessage}}</div>
                <!--{{#errorMessage}}
                    <div class="error" id="{{name}}">{{errorMessage}}</div>
                {{/errorMessage}}-->

            </div>
        {{/fields}}
       <!-- <label for="userId">User ID</label>
      <div>
        <input name="id" id="userId" value="{{value}}">
        <div class="error" id="userIdErr"></div>
      </div>
        <label for="email">User Email</label>
      <div>
	    <input name="email" id="email" value="{{value}}">
	    <div class="error"></div>
      </div>
        <label for="firstName">First Name</label>
      <div>
	    <input name="firstName" id="firstName" value="{{value}}">
	    <div class="error"></div>
      </div>
      <label for="lastName">Last Name</label>
      <div>
	<input name="lastName" id="lastName" value="{{value}}">
	<div class="error"></div>
      </div>
      <label for="creationTime">ISO Creation Time</label>
      <div>
	<input name="creationTime" id="creationTime" value="{{value}}">
	<div class="error"></div>-->


        </div>&nbsp;<input name="submit" type="submit" value="search" class="control"></div>
    </form>
    {{>footer}}
    <script src="/js/userIdCheck.js"></script>















  </body>
</html>
