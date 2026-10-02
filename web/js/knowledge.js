/* knowledge.js - learning hints and interview question banks.
   This is general study guidance written by hand, not job data. It never names
   a job, company or link; those only ever come from processed_jobs.json. */
(function (root) {
  'use strict';
  const JR = root.JR = root.JR || {};

  const LEARN = {
    'Python': ['Finish loops, functions, dictionaries and file handling', 'Build a small script that reads a CSV and prints a summary'],
    'Java': ['Revise OOP: classes, inheritance, interfaces, collections', 'Build a console app with file or database storage'],
    'JavaScript': ['Practise DOM, fetch and async/await', 'Build a small app that calls a public API and renders results'],
    'TypeScript': ['Learn basic types and interfaces', 'Convert one small JavaScript project to TypeScript'],
    'C': ['Pointers, arrays, structs, memory', 'Write a small program that parses sensor-style input'],
    'C++': ['Classes, STL containers, references', 'Solve 10 problems using vectors and maps'],
    'React': ['Components, props, state and hooks', 'Rebuild one of your pages as a React app'],
    'Node.js': ['Express routes, middleware, JSON APIs', 'Build a REST API with 4 endpoints'],
    'REST APIs': ['HTTP methods, status codes, JSON', 'Call two public APIs and build one of your own'],
    'SQL': ['SELECT, JOIN, GROUP BY, indexes', 'Design 3 related tables and write 10 queries'],
    'MongoDB': ['Documents, collections, CRUD', 'Store your project data in MongoDB Atlas free tier'],
    'Git': ['Branches, merges, pull requests', 'Contribute a small change through a pull request'],
    'Linux': ['Navigation, permissions, grep, pipes', 'Write a shell script that automates a daily task'],
    'Docker': ['Images vs containers, Dockerfile basics', 'Containerise one of your projects'],
    'AWS': ['Cloud basics: EC2, S3, IAM', 'Host a static site on S3 or deploy a small app on EC2'],
    'Azure': ['Core services overview', 'Deploy a small web app on the free tier'],
    'GCP': ['Core services overview', 'Deploy a small web app on the free tier'],
    'CI/CD': ['What a pipeline is; GitHub Actions basics', 'Add a workflow that runs tests on each push'],
    'IoT': ['Sensors, protocols, device-to-cloud flow', 'Send ESP32 sensor readings to a dashboard'],
    'Embedded Systems': ['GPIO, timers, interrupts, serial', 'Build a sensor + display project on a microcontroller'],
    'MQTT': ['Publish/subscribe, topics, QoS', 'Publish sensor data to a public broker and subscribe from Python'],
    'Arduino': ['Digital/analog I/O, libraries', 'Build a small monitoring device'],
    'ESP32': ['Wi-Fi, deep sleep, sensors', 'Build a Wi-Fi sensor node'],
    'Raspberry Pi': ['GPIO and Python on Linux', 'Run a small local server or sensor logger'],
    'VLSI': ['Digital logic, Verilog basics', 'Write and simulate a counter and an ALU'],
    'Testing': ['Unit tests, test cases, edge cases', 'Add tests to one of your projects'],
    'Data Structures': ['Arrays, linked lists, stacks, queues, trees, hashing', 'Solve 3 problems a week and explain each aloud'],
    'Machine Learning': ['Regression, classification, train/test split', 'Train a simple model on a public dataset'],
    'Data Analysis': ['Cleaning and summarising data', 'Analyse a public dataset and write 5 findings'],
    'Pandas': ['DataFrames, filtering, groupby', 'Clean a messy CSV end to end'],
    'HTML': ['Semantic tags, forms', 'Build a responsive page'], 'CSS': ['Flexbox, grid, media queries', 'Make a page work on phone and laptop'],
    'Firebase': ['Auth and realtime database', 'Add login and live data to a small app'],
    'OOP': ['Encapsulation, inheritance, polymorphism', 'Model a small system as classes']
  };
  const generic = s => ['Learn the core concepts of ' + s + ' from its official documentation', 'Build one small project that uses ' + s];

  const Q = {
    technical: {
      'Python': ['What is the difference between a list and a tuple?', 'How do dictionaries work and when would you use one?', 'Explain a decorator or a generator with an example.'],
      'Java': ['Explain the four OOP principles with an example.', 'Difference between an interface and an abstract class?', 'How does the Java collections framework work?'],
      'JavaScript': ['What is a closure?', 'Explain promises and async/await.', 'Difference between let, const and var?'],
      'C': ['What is a pointer and how is it different from an array?', 'Explain stack vs heap memory.', 'What does the volatile keyword do?'],
      'C++': ['Difference between reference and pointer?', 'What is RAII?', 'When would you use a vector vs a map?'],
      'SQL': ['Explain INNER vs LEFT JOIN.', 'What is an index and when does it hurt?', 'What does GROUP BY do?'],
      'IoT': ['Describe how a sensor reading reaches a cloud dashboard.', 'Why use MQTT instead of HTTP for devices?', 'How would you keep a battery device running longer?'],
      'Embedded Systems': ['What is an interrupt and why use one?', 'Explain I2C vs SPI vs UART.', 'What is a watchdog timer?'],
      'React': ['What is state vs props?', 'Explain useEffect.', 'Why do lists need keys?'],
      'Node.js': ['How does the event loop work?', 'What is middleware in Express?', 'How do you handle errors in async routes?'],
      'Git': ['Merge vs rebase?', 'How do you undo a pushed commit safely?'],
      'REST APIs': ['What do 200, 201, 400, 401, 404 and 500 mean?', 'PUT vs PATCH?'],
      'Data Structures': ['Compare array and linked list.', 'How does a hash table handle collisions?', 'Explain BFS vs DFS.'],
      'VLSI': ['Blocking vs non-blocking assignment in Verilog?', 'What is setup and hold time?']
    },
    hr: ['Tell me about yourself.', 'Why do you want this role?', 'What is your biggest strength and one weakness?', 'Describe a time you got stuck on a problem. What did you do?', 'Where do you want to be in two years?', 'Why should we pick you as a fresher?'],
    followups: ['Why did you choose that approach?', 'What would you change if you did it again?', 'How would you test it?', 'What was the hardest bug and how did you find it?', 'How would it scale to 10x the users or data?']
  };

  Object.assign(JR, { learnSteps: s => LEARN[s] || generic(s), QUESTION_BANK: Q });
  if (typeof module !== 'undefined') module.exports = JR;
})(typeof window !== 'undefined' ? window : globalThis);
