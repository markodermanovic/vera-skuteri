// @barba/core 2.10 ima pogrešnu "types" putanju u package.json – upućujemo TS na stvarne tipove.
declare module '@barba/core' {
  import barba from '@barba/core/dist/src/core';
  export default barba;
}
