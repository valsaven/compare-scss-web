<script lang="ts">
import { type Change, diffLines } from 'diff';
import * as sass from 'sass';
import { writable } from 'svelte/store';
import ThemeToggle from './lib/ThemeToggle.svelte';

let scss1: string = '';
let scss2: string = '';
let css1: string = '';
let css2: string = '';
const error1 = writable('');
const error2 = writable('');
let diffResult: string = '';

const compileSCSS = async (scss: string) => {
  try {
    const result = await sass.compileStringAsync(scss);
    return result.css;
  } catch (error) {
    if (error instanceof Error) {
      console.error('SCSS compilation error:', error.message);
      return error.message;
    } else {
      console.error('Unknown error:', error);
      return 'Unknown error.';
    }
  }
}

const compareCss = (css1: string, css2: string) => {
  const differences = diffLines(css1, css2);
  const getColor = (part: Change) => {
    if (part.added) { return 'green'; }
    if (part.removed) { return 'red'; }
  };

  diffResult = differences.map(part =>
    `<span class="diff__line" style="color: ${getColor(part)};">${part.value}</span>`
  ).join('')
}

$: compileSCSS(scss1).then(result => {
  css1 = result;
  error1.set('');
});

$: compileSCSS(scss2).then(result => {
  css2 = result;
  error2.set('');
});

$: if (css1 && css2) {
  compareCss(css1, css2);
}

$: error1.set('');
$: error2.set('');
</script>

<main>
  <h1>C<ThemeToggle/>mpare SCSS</h1>

  <div class="code">
    <div class="code__block code__block--scss">
      <div>SCSS 1</div>
      <textarea bind:value={scss1} placeholder="Enter SCSS here..."></textarea>
        {#if $error1}
          <div class="error">{$error1}</div>
        {/if}
    </div>

    <div class="code__block code__block--scss">
      <div>SCSS 2</div>
      <textarea bind:value={scss2} placeholder="Enter SCSS here..."></textarea>
        {#if $error2}
          <div class="error">{$error2}</div>
        {/if}
    </div>

    <div class="code__block code__block--css">
      <div>CSS 1</div>
      <pre>{css1}</pre>
    </div>
    <div class="code__block code__block--css">
      <div>CSS 2</div>
      <pre>{css2}</pre>
    </div>

    <div class="code__block code__block--diff">
      <div>DIFF</div>
      <div class="diff">
        {@html diffResult}
      </div>
    </div>
  </div>
</main>

<style>
textarea,
pre,
.diff {
  box-sizing: border-box;
  height: 200px;
  overflow: auto;
  padding: 1em;
  text-align: left;
  width: 100%;
}

textarea {
  resize: none;
}

textarea:focus-visible {
  outline: none;
}

.error {
  color: red;
  font-weight: bold;
}

pre {
  float: left;
  font-family: monospace;
  margin: 0;
}

pre,
.diff {
  border: 1px solid #ccc;
}

.code {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "scss1 scss2"
    "css1 css2"
    "diff  diff";
}

.code__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code__block--scss:nth-child(1),
.code__block--scss:nth-child(2) {
  background: var(--bg-color);
  color: var(--text-color);
}

.code__block--scss:nth-child(1) { grid-area: scss1; }
.code__block--scss:nth-child(2) { grid-area: scss2; }

.code__block--css:nth-child(1) { grid-area: css1; }
.code__block--css:nth-child(2) { grid-area: css2; }

.code__block--diff { grid-area: diff; }

/* Mobile */
@media (max-width: 767px) {
  .code {
    grid-template-columns: 1fr;
    grid-template-areas:
    "scss1"
    "scss2"
    "css1"
    "css2"
    "diff";
  }
}
</style>
