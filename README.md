## Test Driven Development

An exploration of using AI to act as a pair programmer for software development. 

### How it works

Start the AI pair programmer by running the following command:
```
node AIPair.js <root of project to be edited> [model name (optional)]
```

Valid model values are `gemini-1.5-pro`, `claude-3-5-sonnet`, `claude-3-5-sonnet-20241022`, `gpt-4o`, and `gpt-4o-mini`. Defaults to `gpt-4o`.

The pair programmer will attempt to compile your project and run all the tests. If any tests fail, the pair programmer will generate code to fix the problem. This process will repeat until all the tests pass.

The pair programmer will not change any test files. If the AI believes that a test file needs to be changed then it will show the change as part of the iteration. 

#### Options

On each iteration you can choose to:
- `-c` or enter: Continue with another iteration.
- `-w` : Watch the test directory for changes and rerun the tests and generate code to fix any problems.
- `-m` : Change the model used for code generation and force it to regenerate code. 
- `-h` : Add additional hints to the pair programmer and force it to use the hints to generate code.
- `-e` : Exit the pair programmer.

### Tips
#### Multiple Iterations
It often takes several iterations for the pair to arrive at a functional solution. 

#### Getting unstuck
If you get stuck in an iteration where the pair programmer is not able to generate code to fix the problem then you can provide a hint to the pair programmer. The hint should be a description of the code that you want the pair programmer to generate.

Additionally, the most common reason for the programmer to get stuck is that the test itself
has a problem. In many cases the pair programmer will suggest a change to the test case (but not apply it)

#### Object creation
The pair programmer will create objects that you describe. For example, if you want a new class then you should describe the class and the pair programmer will create the class for you. To ensure that the object is created in the appropriate class, be sure to add a detailed import

#### Code comments
The pair programmer will read comments that you put in the test cases to inform the code
generation. 

#### Overfitting
The pair programmer will sometimes overfit to the test data. If you notice that the pair programmer is not working well then try to add additional varied test cases and hints on how the code should function. 

For example, if you have test code with:
```
assertEquals("some string plus extra", "someFile.someFunction("some string"));
```

The programmer is likely to hardcode that specific scenario. If you want to create a more generic function
then you should add a comment like:
```
// Create a function that can take any string and add "extra" to the end
```
or add additional usescases. 

