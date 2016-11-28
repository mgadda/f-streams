"use strict";
/// !doc
/// ## Encoding mappers
/// 
/// `import * as f from 'f-streams'`  
/// 
import { _ } from 'streamline-runtime';

/// * `mapper = ez.mappers.convert.stringify(encoding)`  
///   returns a mapper that converts to string
export function stringify(encoding?: string) {
	encoding = encoding || 'utf8';
	return (data: Buffer) => {
		return data.toString(encoding);
	}
}
/// * `mapper = ez.mappers.convert.bufferify(encoding)`  
///   returns a mapper that converts to buffer
export function bufferify(encoding?: string) {
	encoding = encoding || 'utf8';
	return (data: string) => {
		return new Buffer(data, encoding);
	}
}