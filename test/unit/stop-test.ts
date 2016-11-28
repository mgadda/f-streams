import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { waitCb } from '../../src/util';

const { equal, ok, strictEqual, deepEqual } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}

interface TestReader extends ez.Reader<number> {
    stoppedReason?: {
        at: number;
        arg: any;
    }
}

//interface TestReader extends ez.reader.Reader<number> 
function numbers(limit: number): TestReader {
    var i = 0;
    return ez.devices.generic.reader(function read(this: TestReader) {
        if (this.stoppedReason) throw new Error("attempt to read after stop: " + i);
        return i >= limit ? undefined : i++;
    }, function stop(this: TestReader, arg: any) {
        this.stoppedReason = {
            at: i,
            arg: arg,
        };
    }) as TestReader;
}

describe(module.id, () => {
    test("explicit stop", () => {
        const source = numbers(100);
        var result = ''
        for (var i = 0; i < 5; i++) result += source.read();
        source.stop();
        strictEqual(result, "01234");
        strictEqual(source.stoppedReason && source.stoppedReason.at, 5);
    });

    test("explicit stop with err", () => {
        const source = numbers(100);
        var result = ''
        for (var i = 0; i < 5; i++) result += source.read();
        const err = new Error("testing");
        source.stop(err);
        strictEqual(result, "01234");
        strictEqual(source.stoppedReason && source.stoppedReason.arg, err);
    });

    // limit exercises transform
    test("limit stops", () => {
        var source = numbers(100);
        const result = source.skip(2).limit(5).toArray().join(',');
        strictEqual(result, '2,3,4,5,6');
        ok(source.stoppedReason, 'stopped');
    });

    test("concat stops", () => {
        const source1 = numbers(5);
        const source2 = numbers(5);
        const source3 = numbers(5);
        const result = source1.concat([source2, source3]).limit(7).toArray().join(',');
        strictEqual(result, '0,1,2,3,4,0,1');
        ok(!source1.stoppedReason, 'source1 not stopped');
        ok(source2.stoppedReason, 'source2 stopped');
        ok(source3.stoppedReason, 'source3 stopped');
    });

    test("dup stops on 0 and continues on 1", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[0].limit(2).toArray());
        const altF = run(() => dups[1].toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2,3,4');
        ok(!source.stoppedReason, 'source not stopped');
    });

    test("dup stops on 1 and continues on 0", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[1].limit(2).toArray());
        const altF = run(() => dups[0].toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2,3,4');
        ok(!source.stoppedReason, 'source not stopped');
    });

    test("dup stops both silently from 0", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[0].limit(2, true).toArray());
        const altF = run(() => dups[1].toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
        ok(source.stoppedReason, 'source stopped');
    });

    test("dup stops both silently from 1", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[1].limit(2, true).toArray());
        const altF = run(() => dups[0].toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
        ok(source.stoppedReason, 'source stopped');
    });

    test("dup stops with error from 0", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[0].limit(2, new Error("testing")).toArray());
        const altF = run(() => dups[1].toArray());
        const result = wait(resultF).join();
        try {
            const alt = wait(altF).join();
            ok(false, "altF did not throw");
        } catch (ex) {
            strictEqual(ex.message, "testing");
        }
        strictEqual(result, '0,1');
        ok(source.stoppedReason, 'source stopped');
    });

    test("dup stops with error from 1", () => {
        const source = numbers(5);
        const dups = source.dup();
        const resultF = run(() => dups[1].limit(2, new Error("testing")).toArray());
        const altF = run(() => dups[0].toArray());
        const result = wait(resultF).join();
        try {
            const alt = wait(altF).join();
            ok(false, "altF did not throw");
        } catch (ex) {
            strictEqual(ex.message, "testing");
        }
        strictEqual(result, '0,1');
        ok(source.stoppedReason, 'source stopped');
    });

    test("dup stops 0 first, 1 later", () => {
        const source = numbers(10);
        const dups = source.dup();
        const resultF = run(() => dups[0].limit(2).toArray());
        const altF = run(() => dups[1].limit(5).toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2,3,4');
        ok(source.stoppedReason, 'source stopped');
    });

    test("dup stops 1 first, 0 later", () => {
        const source = numbers(10);
        const dups = source.dup();
        const resultF = run(() => dups[1].limit(2).toArray());
        const altF = run(() => dups[0].limit(5).toArray());
        const result = wait(resultF).join();
        const alt = wait(altF).join();
        waitCb(cb => setTimeout(cb, 0));
        strictEqual(result, '0,1');
        strictEqual(alt, '0,1,2,3,4');
        ok(source.stoppedReason, 'source stopped');
    });

    test("pre", () => {
        const source = numbers(10);
        const target = ez.devices.array.writer();
        source.pipe(target.pre.limit(5));
        strictEqual(target.toArray().join(), '0,1,2,3,4');
        ok(source.stoppedReason, 'source stopped');
    });
});