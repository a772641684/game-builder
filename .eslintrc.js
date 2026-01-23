module.exports = {
    extends: ["alloy", "alloy/typescript"],
    env: {},
    globals: {
        cc: false,
        jsb: false,
        sp: false,
        CC_DEV: false,
        CC_EDITOR: false,
        wx: false,
        canvas: false,
        qg: false,
        CC_JSB: false,
        CC_RUNTIME: false,
    },
    // built-in https://eslint.org/docs/latest/user-guide/configuring/rules
    // typescript-eslint https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin/docs/rules
    // eslint-config-alloy https://github.com/AlloyTeam/eslint-config-alloy/blob/06bc465458531cb978cf8500dd1391d1b1cbbbd2/typescript.js
    // eslint-config-alloy-built-in https://github.com/AlloyTeam/eslint-config-alloy/blob/06bc465458531cb978cf8500dd1391d1b1cbbbd2/base.js
    rules: {
        /**
         * 必须设置类的成员的可访问性
         */
        "@typescript-eslint/explicit-member-accessibility": "off",
        /**
         * 指定类成员的排序规则
         */
        "@typescript-eslint/member-ordering": "off",
        /**
         * 禁止给一个初始化时直接赋值为 number, string 的变量显式的声明类型
         */
        "@typescript-eslint/no-inferrable-types": [
            "error",
            {
                ignoreParameters: true,
                ignoreProperties: true,
            },
        ],
        /**
         * 使用 for 循环遍历数组时，如果索引仅用于获取成员，则必须使用 for of 循环替代 for 循环
         */
        "@typescript-eslint/prefer-for-of": "off",
        /**
         * 使用 optional chaining 替代 &&
         */
        "@typescript-eslint/prefer-optional-chain": "off",
        /**
         * interface 和 type 定义时必须声明成员的类型
         */
        "@typescript-eslint/typedef": [
            "error",
            {
                arrayDestructuring: false,
                arrowParameter: false,
                memberVariableDeclaration: true,
                objectDestructuring: false,
                parameter: true,
                propertyDeclaration: true,
                variableDeclaration: false,
            },
        ],
        /**
         * 函数返回值必须与声明的类型一致
         */
        "@typescript-eslint/explicit-function-return-type": [
            "error",
            {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
            },
        ],
        /**
         * 限制各种变量或类型的命名规则
         */
        "@typescript-eslint/naming-convention": [
            "error",
            {
                selector: [
                    "function",
                    "parameter",
                    "classProperty",
                    "typeProperty",
                    "parameterProperty",
                    "objectLiteralMethod",
                    "typeMethod",
                    "accessor",
                ],
                format: ["camelCase"],
            },
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE"],
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
            {
                selector: "interface",
                format: ["PascalCase"],
                prefix: ["I"],
            },
            {
                selector: "enum",
                format: ["PascalCase", "UPPER_CASE"],
            },
            {
                selector: "enumMember",
                format: ["UPPER_CASE"],
            },
            {
                selector: "objectLiteralProperty",
                format: ["camelCase", "UPPER_CASE"],
            },
            {
                selector: "classMethod",
                format: ["camelCase"],
                filter: {
                    regex: "__preload",
                    match: false,
                },
            },
        ],

        /**
         * 函数的参数禁止超过 n 个
         */
        "max-params": "off",
        /**
         * 禁止使用 ~+ !! 等难以理解的类型转换
         */
        "no-implicit-coercion": "off",
        /**
         * for in 内部必须有 hasOwnProperty
         */
        "guard-for-in": "off",
        /**
         * 禁止修改原生对象
         */
        "no-extend-native": "off",
        /**
         * switch 的 case 内有变量定义的时候，必须使用大括号将 case 内变成一个代码块
         */
        "no-case-declarations": "off",
        /**
         * 禁止对函数的参数重新赋值
         */
        "no-param-reassign": "off",
        /**
         * 禁止函数的循环复杂度超过 N
         */
        complexity: "off",
        /**
         * parseInt 必须传入第二个参数
         */
        radix: "off",
        /**
         * 禁止使用 eval
         */
        "no-eval": "error",
        /**
         * 禁止在数组中出现连续的逗号
         */
        "no-sparse-arrays": "off",
        /**
         * 代码块嵌套的深度禁止超过 10 层
         */
        "max-depth": ["error", 10],
        /**
         * 回调函数嵌套禁止超过 5 层
         */
        "max-nested-callbacks": ["error", 5],
        /**
         * Promise 的 reject 中必须传入 Error 对象，而不是字面量
         */
        "prefer-promise-reject-errors": [
            "error",
            {
                allowEmptyReject: true,
            },
        ],
        /**
         * 优先使用正则表达式字面量，而不是 RegExp 构造函数
         */
        "prefer-regex-literals": "off",
        /**
         * 申明后不再被修改的变量必须使用 const 来申明
         */
        "prefer-const": "error",
        /**
         * 禁止使用位运算
         */
        "no-bitwise": "error",
        /**
         * 已定义的变量必须使用
         */
        "no-unused-vars": "error",
        /**
         * 禁止使用 console
         */
        "no-console": "error",
        /**
         * 必须使用 !a 替代 a ? false : true
         */
        "no-unneeded-ternary": "error",
        /**
         * 禁止使用 foo['bar']，必须写成 foo.bar
         */
        "dot-notation": "error",
        /**
         * switch 语句必须有 default
         */
        "default-case": "error",
        /**
         * 有默认值的参数必须放在函数参数的末尾
         */
        "default-param-last": "error",
        /**
         * 必须使用 a = {b} 而不是 a = {b: b}
         */
        "object-shorthand": "error",
        /**
         * 禁止在 return 语句里赋值
         */
        "no-return-assign": "error",
        /**
         * 数组的方法除了 forEach 之外，回调函数必须有返回值
         */
        "array-callback-return": "error",
        /**
         * 禁止枚举类型存在两个相同的值
         */
        "@typescript-eslint/no-duplicate-enum-values": "error",
        /**
         * 禁止将 this 赋值给其他变量，除非是解构赋值
         */
        "@typescript-eslint/no-this-alias": "error",
        /**
         * 禁止使用断言
         */
        "@typescript-eslint/consistent-type-assertions": "error",
        /**
         * 约束多行注释的格式
         */
        "multiline-comment-style": "error",
        /**
         * 注释的斜线或 * 后必须有空格
         */
        "spaced-comment": "error",
    },
};
