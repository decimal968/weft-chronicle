// Ambient declarations for the Spindle host bridge and other pre-existing
// globals relied on by the bundles. The host injects `spindle` before the
// bundle loads; `module`/`process` exist only in the Node test harness.
declare var spindle: any;
declare var ctx: any;
declare var module: any;
declare var process: any;
declare var console: Console;
