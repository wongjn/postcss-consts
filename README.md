# PostCSS Constants

Enables a way of declaring CSS custom Properties as being "constants" in similar
way that constants are available in other programming languages.

## Usage

By default, the plugin is set to understand that any CSS variables with a name
that have no lowercase characters are constants. These constants will be removed
from the CSS, with their usage in values replaced with their respective values
when they were first declared. The constants must be declared in a `:root`
rule.

### Basic Example

With the following configuration:

```js
postcss([require('postcss-consts')]);
```

Then the following:

```css
:root {
  --CONSTANT-HERE: green;
  --not-a-constant: white;
}

body {
  background-color: var(--CONSTANT-HERE);
  color: var(--not-a-constant);
}
```

becomes

```css
:root {
  --not-a-constant: white;
}

body {
  background-color: green;
  color: var(--not-a-constant);
}
```

### Global Constants File

You can also specify a stylesheet that contains constants to use for all your
other stylesheets.

```js
postcss([require('postcss-consts')('./css/variables.css')]);

// OR

postcss([
  require('postcss-consts')({
    file: './css/variables.css',
  })
]);
```

Before:

```css
/* ./css/variables.css */
:root {
  --CONSTANT-HERE: green;
  --CONSTANT-THERE: blue;
  --ANOTHER-CONSTANT: white;
  --not-a-constant: var(--ANOTHER-CONSTANT);
}


/* ./css/typography.css */
body {
  color: var(--CONSTANT-HERE);
  background-color: var(--not-a-constant);
}

h1 {
  color: var(--CONSTANT-THERE);
}

/* ./css/tables.css */
td {
  color: var(--CONSTANT-HERE);
}

th {
  color: var(--CONSTANT-THERE);
}
```

After:

```css
/* ./css/variables.css */
:root {
  --not-a-constant: white;
}


/* ./css/typography.css */
body {
  color: green;
  background-color: var(--not-a-constant);
}

h1 {
  color: blue;
}

/* ./css/tables.css */
td {
  color: green;
}

th {
  color: blue;
}
```

### Custom Filtering Regex

You can specify your own filtering regex by passing a regex object, or passing
an object with the regex value keyed by `regex`:

```js
postcss([require('postcss-consts')(/REGEX/)]);

// OR

postcss([
  require('postcss-consts')({
    regex: /REGEX/,
  })
]);
```

The regex is tested against the whole variable name, including the `--` prefix
for a custom property.
