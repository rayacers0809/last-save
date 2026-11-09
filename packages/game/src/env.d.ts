/// <reference types="vite/client" />
declare module '*.ink' {
  const story: object;
  export default story;
}
declare module 'inkjs/dist/ink-es6.js' {
  export { Story, InkList } from 'inkjs/engine/Story';
}
