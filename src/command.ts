import * as R from "ramda";

/*

    note: base data structure is an array used as
    a stack. atoms on the list are either be symbols
    (commands) or values. each calculation is a list
    of operations that are processed in order of
    occurrence. this is an implementation of a list
    processor (lisp) for reverse polish notation
    s-expressions (sexp).

      operations list structure
        ( object : command or value )
        "5"
        "sqrt"
        "1
        "-"
        "2"
        "/"

    a list evaluation engine takes the list of
    strings and executes the corresponding oper-
    ations then returns the resulting mutated
    stack.

*/

type Stack = string[];
type Op = string;
type Ops = string[];
type StackFn = (input: Stack) => Stack;

const getOp = (stck: Stack): [Op, Stack] => {
  const op: Op = R.takeLast(1)(stck)[0];
  const rest: Stack = R.dropLast(1)(stck) as Stack;
  return [op, rest];
};

const getNumber = (stck: Stack): [Stack, number] => {
  const n: number = parseFloat(R.takeLast(1)(stck)[0]);
  const rest: Stack = R.dropLast(1)(stck) as Stack;
  return [rest, n];
};

const getNumber2 = (stck: Stack): [Stack, number, number] => {
  const [restb, b] = getNumber(stck);
  const [rest, a] = getNumber(restb);
  return [rest, a, b];
};

const getNumber3 = (stck: Stack): [Stack, number, number, number] => {
  const [restc, c] = getNumber(stck);
  const [restb, b] = getNumber(restc);
  const [rest, a] = getNumber(restb);
  return [rest, a, b, c];
};

export class Command {
  cmds = new Map<string, StackFn>(); // built-in commands
  userCmds = new Map<string, Ops>(); // user-defined and anonymous functions

  loadingUserDefFunc = false;

  // user-defined functions
  public getUserCmdNames = (): string[] =>
    [...this.userCmds.keys()].filter((x) => x !== "_");

  // evaluateOps
  public evaluateOps =
    (ops: Ops) =>
    (stck: Stack): Stack => {
      console.log({ ops, stck });

      const out_st: Stack = ops.reduce((interimStack: Stack, op: Op): Stack => {
        console.log({ interimStack, op });

        console.log(`loading? {${this.loadingUserDefFunc}}`);

        switch (this.loadingUserDefFunc) {
          case false: // default (general case) - not loading user function
            switch (this.cmds.has(op)) {
              case true: // command (known)
                return this.cmds.get(op)!(interimStack)!;
              case false:
                if (this.userCmds.has(op)) {
                  console.log(`executing user function (name=${op})`);
                  //console.log(`$expression={this.userCmds.get(op)}`);
                  const updatedStck = this.evaluateOps(this.userCmds.get(op)!)(
                    interimStack
                  ); // recursive call to evaluateOps
                  return updatedStck;
                } else {
                  return [...interimStack, op]; // value (unknown command)
                }
            }
          case true:
            console.log(`loading user function definition (op=${op})`);
            this.loadingUserDefFunc = this.loadUserDefFunc(op);
            return [...interimStack];
        }
      }, stck);

      return out_st;
    };

  // user-defined functions
  lambdaChar: string = "_";
  udfStartChar: string = "(";
  udfEndChar: string = ")";

  loadUserDefFunc = (() => {
    let instantiated = false;
    let name: string = "";

    return (op: Op): boolean => {
      console.log(
        `running loadUserDefFunc (op=${op}) (instantiated=${instantiated})`
      );
      switch (instantiated) {
        case false:
          name = op;
          console.log(`adding user function definition (name=${name})`);
          this.userCmds.set(name, []);
          instantiated = true;
          return true; // continue loading
        case true:
          if (op === this.udfEndChar) {
            // stop loading (recording) user function
            instantiated = false; // reset
            return false;
          }
          this.userCmds.get(name)!.push(op);
          return true; // continue loading
      }
    };
  })();

  // constructor - create built-in commands
  constructor() {
    // simple nullary operations -----------------------------------------------
    this.cmds.set("pi", (stck: Stack): Stack => [...stck, Math.PI.toString()]);
    this.cmds.set("e", (stck: Stack): Stack => [...stck, Math.E.toString()]);

    // simple unary operations -------------------------------------------------
    // take a single number from the stack and apply a unary operation and
    // return a single number result to the top of stack
    type UnaryOperator = (a: number) => number;

    const executeUnaryOp = (op: UnaryOperator): ((stck: Stack) => Stack) => {
      return (stck: Stack): Stack => {
        const [rest, a] = getNumber(stck);
        return [...rest, op(a).toString()];
      };
    };

    this.cmds.set("abs", executeUnaryOp(Math.abs));
    this.cmds.set(
      "chs",
      executeUnaryOp((a: number) => -a)
    );
    this.cmds.set("floor", executeUnaryOp(Math.floor));
    this.cmds.set("ceil", executeUnaryOp(Math.ceil));
    this.cmds.set(
      "inv",
      executeUnaryOp((a: number) => 1 / a)
    );
    this.cmds.set("ln", executeUnaryOp(Math.log));
    this.cmds.set("log", executeUnaryOp(Math.log10));
    this.cmds.set("log2", executeUnaryOp(Math.log2));
    this.cmds.set("log10", executeUnaryOp(Math.log10));
    this.cmds.set("round", executeUnaryOp(Math.round));
    this.cmds.set("sgn", executeUnaryOp(Math.sign));
    this.cmds.set("sqrt", executeUnaryOp(Math.sqrt));
    this.cmds.set(
      "!",
      executeUnaryOp((a: number) => R.product(R.range(1)(a)))
    );

    const radToDeg = (a: number): number => (a * 180) / Math.PI;
    const degToRad = (a: number): number => (a * Math.PI) / 180;
    this.cmds.set("deg_rad", executeUnaryOp(degToRad));
    this.cmds.set("rad_deg", executeUnaryOp(radToDeg));
    this.cmds.set("sin", executeUnaryOp(Math.sin));
    this.cmds.set("cos", executeUnaryOp(Math.cos));
    this.cmds.set("tan", executeUnaryOp(Math.tan));
    this.cmds.set("asin", executeUnaryOp(Math.asin));
    this.cmds.set("acos", executeUnaryOp(Math.acos));
    this.cmds.set("atan", executeUnaryOp(Math.atan));

    // conversions
    this.cmds.set(
      "c_f",
      executeUnaryOp((a) => (a * 9) / 5 + 32)
    );
    this.cmds.set(
      "f_c",
      executeUnaryOp((a) => ((a - 32) * 5) / 9)
    );
    this.cmds.set(
      "mi_km",
      executeUnaryOp((a) => a * 1.60934)
    );
    this.cmds.set(
      "km_mi",
      executeUnaryOp((a) => a / 1.60934)
    );
    this.cmds.set(
      "m_ft",
      executeUnaryOp((a) => a * 3.28084)
    );
    this.cmds.set(
      "ft_m",
      executeUnaryOp((a) => a / 3.28084)
    );
    this.cmds.set(
      "dec_hex",
      executeUnaryOp((a) => parseInt(a.toString(16)))
    );
    //this.cmds.set(
    //  "hex_dec",
    //  executeUnaryOp((a) => parseInt(a.toString(), 16))
    //);
    this.cmds.set(
      "dec_bin",
      executeUnaryOp((a) => parseInt(a.toString(2)))
    );
    //this.cmds.set(
    //  "bin_dec",
    //  executeUnaryOp((a) => parseInt(a.toString(), 2))
    //);
    this.cmds.set(
      "dec_oct",
      executeUnaryOp((a) => parseInt(a.toString(8)))
    );
    //this.cmds.set(
    //  "oct_dec",
    //  executeUnaryOp((a) => parseInt(a.toString(), 8))
    //);

    // simple binary operations ------------------------------------------------
    // take two numbers from the stack and apply a binary operation and return
    // a single number result to the top of stack
    type BinaryOperator = (a: number, b: number) => number;

    const executeBinaryOp = (op: BinaryOperator): ((stck: Stack) => Stack) => {
      return (stck: Stack): Stack => {
        const [rest, a, b] = getNumber2(stck);
        return [...rest, op(a, b).toString()];
      };
    };

    this.cmds.set("+", executeBinaryOp(R.add));
    this.cmds.set("-", executeBinaryOp(R.subtract));
    this.cmds.set("x", executeBinaryOp(R.multiply));
    this.cmds.set("/", executeBinaryOp(R.divide));
    this.cmds.set("%", executeBinaryOp(R.modulo));
    this.cmds.set("^", executeBinaryOp(Math.pow));
    this.cmds.set("min", executeBinaryOp(Math.min));
    this.cmds.set("max", executeBinaryOp(Math.max));
    this.cmds.set(
      "nroot",
      executeBinaryOp((a, b) => Math.pow(a, 1 / b))
    );
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    this.cmds.set("gcd" as string, executeBinaryOp(gcd));
    this.cmds.set(
      "logn",
      executeBinaryOp((a, b) => Math.log(a) / Math.log(b))
    );

    // stack operations
    this.cmds.set("cls", (stck: Stack): Stack => []);
    this.cmds.set("drop", (stck: Stack): Stack => R.dropLast(1)(stck) as Stack);
    this.cmds.set("dropn", (stck: Stack): Stack => {
      const [rest, a] = getNumber(stck);
      return R.dropLast(a)(rest) as Stack;
    });
    this.cmds.set(
      "dup",
      (stck: Stack): Stack => [...stck, ...R.takeLast(1)(stck)]
    );
    this.cmds.set("roll", (stck: Stack): Stack => {
      const a = R.takeLast(1)(stck);
      const rest = R.dropLast(1)(stck);
      return [...a, ...rest] as Stack;
    });
    this.cmds.set("rolln", (stck: Stack): Stack => {
      const [rest, n] = getNumber(stck);
      const top = R.takeLast(n)(rest);
      const bottom = R.dropLast(n)(rest);
      return [...top, ...bottom] as Stack;
    });
    this.cmds.set("rot", (stck: Stack): Stack => {
      const a = R.take(1)(stck);
      const rest = R.drop(1)(stck);
      return [...rest, ...a] as Stack;
    });
    this.cmds.set("rotn", (stck: Stack): Stack => {
      const [rest, n] = getNumber(stck);
      const bottom = R.take(n)(rest);
      const top = R.drop(n)(rest);
      return [...top, ...bottom] as Stack;
    });
    this.cmds.set("swap", (stck: Stack): Stack => {
      const [a, b] = R.takeLast(2)(stck);
      const rest: Stack = R.dropLast(2)(stck) as Stack;
      return [...rest, b, a];
    });

    // ???
    this.cmds.set(
      "sum",
      (stck: Stack): Stack => [
        stck.reduce((sum, a) => sum + parseFloat(a), 0).toString(),
      ]
    );
    this.cmds.set(
      "prod",
      (stck: Stack): Stack => [
        stck.reduce((prod, a) => prod * parseFloat(a), 1).toString(),
      ]
    );

    // ???
    this.cmds.set("io", (stck: Stack): Stack => {
      const [rest, a] = getNumber(stck);
      return [
        ...rest,
        ...Array.from(Array(a).keys()).map((a) => (a + 1).toString()),
      ];
    });
    this.cmds.set("to", (stck: Stack): Stack => {
      const range = (from: number, end: number, step: number): number[] => {
        return to > from
          ? R.unfold((n) => (n <= end ? [n, n + Math.abs(step)] : false), from)
          : R.unfold((n) => (n >= end ? [n, n - Math.abs(step)] : false), from);
      };

      const [rest, from, to, step] = getNumber3(stck);

      return [...rest, ...range(from, to, step).map((a) => a.toString())];
    });

    // user storage ------------------------------------------------------------
    this.cmds.set("store", (stck: Stack): Stack => {
      const [value, name] = R.takeLast(2)(stck);
      const rest: Stack = R.dropLast(2)(stck) as Stack;
      console.log("store cmd", { name, value, rest });
      this.userCmds.set(name, [value]);
      return rest;
    });

    // higher-order functions --------------------------------------------------
    this.cmds.set(this.udfStartChar, (stck: Stack): Stack => {
      console.log("setting loadingUserDefFunc to {true}");
      this.loadingUserDefFunc = true;
      return [...stck];
    });

    this.cmds.set("map", (stck: Stack): Stack => {
      const outStck: Stack = stck
        .map((a) => this.evaluateOps(this.userCmds.get("_")!)([a]))
        .flat();
      return outStck;
    });
  }
}
