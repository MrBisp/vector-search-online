import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Employees() {

  //Input
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(['']);
  const [inputEmbedding, setInputEmbedding] = useState('');
  const [outputEmbeddings, setOutputEmbeddings] = useState([]);
  const [extraEmbeddings, setExtraEmbeddings] = useState([]);
  const [extraContent, setExtraContent] = useState('');
  const [extraAndInputEmbeddings, setExtraAndInputEmbeddings] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [response, setResponse] = useState('');

    const [description, setDescription] = useState('');
    const [projects, setProjects] = useState([]);
    const [highlightedSkills, setHighlightedSkills] = useState([]);
    const [employeeName, setEmployeeName] = useState('');


  //Make a button click handler
  const inputEmbeddingHandler = () => {
    //Get the embedding of the input
    fetch('/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: input })
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Embedding for input: received");
        setInputEmbedding(data.message[0].embedding);
      });

      matchHandler();
  };

  const outputEmbeddingHandler = () => {
    //For each output, get the embedding. Save each embedding as a JSON object with index and embedding
    let embeddings = [];

    output.forEach((item, i) => {
      fetch('/api/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: item })
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Embedding for output: received");
          embeddings.push({ index: i, embedding: data.message[0].embedding });
          setOutputEmbeddings(embeddings);
        });
    });

    matchHandler();
  }

  const addHandler = () => {
    setOutput([...output, '']);
  }

  const removeOutputHandler = (index) => {
    let newOutput = [...output];
    newOutput.splice(index, 1);
    setOutput(newOutput);

    let newOutputEmbeddings = [...outputEmbeddings];
    newOutputEmbeddings.splice(index, 1);
    setOutputEmbeddings(newOutputEmbeddings);
  }

  const cosineSimilarity = (a, b) => {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for(let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    return dotProduct / (magA * magB);
  }

  const matchHandler = async () => {
    if (!inputEmbedding || outputEmbeddings.length === 0) {
      setUserMessage('Please save input and output embeddings');
      return;
    }
  
    setUserMessage('Calculating...');
  
    let matchScores = [];
  
    outputEmbeddings.forEach((item) => {
      let score = cosineSimilarity(inputEmbedding, item.embedding);
      let percentage = (score * 100).toFixed(2);  // Convert to percentage
      matchScores.push({ index: item.index, score: percentage });
    });
  
    matchScores.sort((a, b) => b.score - a.score);
  
    let message = 'Match scores: <br />';
    matchScores.forEach((item) => {
      message += `Output ${item.index}: ${item.score}%, <br />----------------<br />`;
    });
  
    setUserMessage(message);
  
    // For the top match, generate a response
    let item = matchScores[0];
    let prompt = `Respond with JSON. Start with {. I want you to generate an explaination for why a certain employee has been matched with a project role.`;
    prompt += `{"name": "Joh Doe", "explanation": "John Doe is an experienced software engnineer with a strong background in Java and Python. He has worked on multiple projects in the past and has a good understanding of the software development lifecycle. He is a good fit for the role of a software engineer.", "highlighted-skills": [{"skill": "Java", "level": "8"}, {"skill": "Python", "level": "8"}], "projects": [{"name": "Project A", "role": "Software Engineer"}]}`;
    prompt += `Project description: ${input}. Employee: ${output[item.index]}. Keep it short and without formatting.`;
    prompt += "It is very important, that you do not make up anything that is not in the text. If you are not sure, please leave it blank. Please do not include ```json, just start with {";
    
    // Wait for the response
    let responseText = await generateHandler(prompt);

    console.log(responseText);

    //Let's process the response by extracting the name, explaination, highlighted skills, and projects
    let responseJSON = JSON.parse(responseText);
    setEmployeeName(responseJSON.name);
    setDescription(responseJSON.explanation);
    setHighlightedSkills(responseJSON['highlighted-skills']);
    setProjects(responseJSON.projects);
    
    setResponse(responseText);  // Set the response correctly
  };

  const generateHandler = async (i) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: i })
    });

    const data = await response.json();
    const generatedMessage = data.message.choices[0].message.content;

    return generatedMessage;  // Return the content correctly
  }


  //This function first embed the extra, and then adds this to the input embedding, and performs a match on this
  const extraHandler = async () => {
    //Get the embedding of the extra content
    fetch('/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: extraContent })
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Embedding for extra content: received");
        setExtraEmbeddings(data.message[0].embedding);
      });

    //Add the extra content to the input embedding
    let newInputEmbedding = [...inputEmbedding];
    extraEmbeddings.forEach((item, i) => {
      newInputEmbedding[i] += item;
    });

    //Set the new input embedding
    setInputEmbedding(newInputEmbedding);

    //Match the new input embedding with the output embeddings
    matchHandler();
  }

  return (
    <div>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>Vector matching</h1>
      <p>
        In this page, you can input a text and match it with a list of elements. We will show you the match score, along with which elements are the better matches.
      </p>

      <div className="container" style={{ display: 'flex', flexDirection: 'row' }}>
        <div>
          <h2>Input</h2>
          <p>Input some text here...</p>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <div>
          <h2>Output</h2>
          <p>Input the elements that the input might match with</p>
          {
            output.map((item, i) => (
              <>
                <textarea key={i} value={item} onChange={(e) => {
                  let newOutput = [...output];
                  newOutput[i] = e.target.value;
                  setOutput(newOutput);
                }} style={{ display: 'block' }} />
                <span>
                  <button onClick={() => {
                    removeOutputHandler(i);
                  } }>Remove</button>
                </span>
                <br /><br /><br />
              </>
            ))
          }
          <button onClick={addHandler}>Add output</button>
        </div>
      </div>

      <button onClick={inputEmbeddingHandler}>Save input</button>
      <button onClick={outputEmbeddingHandler}>Save output</button>
      <button onClick={matchHandler}>Match</button>
      

      <br /><br />
      <p>
        {inputEmbedding ? 'Input embedding saved' : 'Input embedding not saved'}
      </p>
      <p>
        {outputEmbeddings.length > 0 ? 'Output embeddings saved' : 'Output embeddings not saved'}
      </p>
      <p dangerouslySetInnerHTML={{ __html: userMessage }}></p>
      <p>
          {employeeName ? `Employee: ${employeeName}` : ''}<br />
           {description ? `Description: ${description}` : ''}<br />
              {highlightedSkills.length > 0 ? `Highlighted skills: ${highlightedSkills.map((item) => `${item.skill} (${item.level})`).join(', ')}` : ''}<br />
                {projects.length > 0 ? `Projects: ${projects.map((item) => `${item.name} (${item.role})`).join(', ')}` : ''}<br />
      </p>
      <br /><br /><br />
      <p>Show me more of:</p>
        <textarea value={extraContent} onChange={(e) => setExtraContent(e.target.value)} />
        <button onClick={extraHandler}>Extra</button>
  </div>
  );
}