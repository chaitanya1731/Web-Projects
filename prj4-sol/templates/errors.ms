<!DOCTYPE html>
<head>
  <title>Errors</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
{{#errors}}
  <p class="error">{{msg}}</p>
{{/errors}}
{{>footer}}
</body>
</html>
