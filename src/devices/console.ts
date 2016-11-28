import { _ } from "streamline-runtime";
import { Writer } from "../writer";
import * as generic from './generic';

function consoleWriter(fn: (message: string) => void) {
	return generic.writer(function (this: Writer<string>, value: any) {
		if (value !== undefined) fn(value);
		return this;
	});
}

/// !doc
/// ## Console EZ streams
/// 
/// `import * as f from 'f-streams'`
/// 
/// * `ez.devices.console.log`  
/// * `ez.devices.console.info`  
/// * `ez.devices.console.warn`  
/// * `ez.devices.console.errors`  
///   EZ writers for console 
export const log: Writer<string> = consoleWriter(console.log);
export const info: Writer<string> = consoleWriter(console.info);
export const warn: Writer<string> = consoleWriter(console.warn);
export const error: Writer<string> = consoleWriter(console.error);
