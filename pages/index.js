import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  // Input state
  const [input, setInput] = useState('Yellow fruit');
  const [output, setOutput] = useState(['apple', 'orange', 'banana']);

  // Embedding states with content tracking
  const [inputEmbedding, setInputEmbedding] = useState({ text: '', embedding: null });
  const [outputEmbeddings, setOutputEmbeddings] = useState([]);

  // UI states
  const [userMessage, setUserMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate single output embedding
  const calculateOutputEmbedding = async (text, index) => {
    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      return { index, text, embedding: data.message[0].embedding };
    } catch (error) {
      console.error('Error calculating embedding:', error);
      return null;
    }
  };

  const handleInputChange = (newInput) => {
    setInput(newInput);
    setInputEmbedding({ text: '', embedding: null });
  };

  const handleOutputChange = (index, newText) => {
    const newOutput = [...output];
    newOutput[index] = newText;
    setOutput(newOutput);

    setOutputEmbeddings(prev => prev.map(item =>
      item.index === index ? { ...item, text: '', embedding: null } : item
    ));
  };

  // Calculate input embedding and return the result
  const calculateInputEmbeddingIfNeeded = async () => {
    if (inputEmbedding.text !== input) {
      try {
        const res = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input })
        });
        const data = await res.json();
        const newInputEmbedding = { text: input, embedding: data.message[0].embedding };
        setInputEmbedding(newInputEmbedding);
        return newInputEmbedding;
      } catch (error) {
        console.error('Error calculating input embedding:', error);
        return null;
      }
    }
    return inputEmbedding;
  };

  // Calculate output embeddings and return the results
  const calculateOutputEmbeddingsIfNeeded = async () => {
    const updatedEmbeddings = [...outputEmbeddings];
    let hasUpdates = false;

    for (let i = 0; i < output.length; i++) {
      const existingEmbedding = updatedEmbeddings.find(e => e.index === i);

      if (!existingEmbedding || existingEmbedding.text !== output[i]) {
        const newEmbedding = await calculateOutputEmbedding(output[i], i);
        if (newEmbedding) {
          hasUpdates = true;
          const index = updatedEmbeddings.findIndex(e => e.index === i);
          if (index >= 0) {
            updatedEmbeddings[index] = newEmbedding;
          } else {
            updatedEmbeddings.push(newEmbedding);
          }
        }
      }
    }

    if (hasUpdates) {
      setOutputEmbeddings(updatedEmbeddings);
    }
    return updatedEmbeddings;
  };

  const addHandler = () => {
    setOutput([...output, '']);
  };

  const removeOutputHandler = (index) => {
    const newOutput = [...output];
    newOutput.splice(index, 1);
    setOutput(newOutput);

    setOutputEmbeddings(prev => prev.filter(item => item.index !== index));
  };

  const cosineSimilarity = (a, b) => {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    return dotProduct / (magA * magB);
  };

  const matchHandler = async () => {
    if (isCalculating) return;

    setIsCalculating(true);
    setUserMessage('Calculating...');

    try {
      // Get latest embeddings and wait for both calculations to complete
      const [latestInputEmbedding, latestOutputEmbeddings] = await Promise.all([
        calculateInputEmbeddingIfNeeded(),
        calculateOutputEmbeddingsIfNeeded()
      ]);

      if (!latestInputEmbedding || !latestOutputEmbeddings.length) {
        setUserMessage('Error: Could not calculate embeddings');
        return;
      }

      // Calculate match scores using the latest embeddings
      let matchScores = latestOutputEmbeddings.map(item => {
        const score = cosineSimilarity(latestInputEmbedding.embedding, item.embedding);
        const percentage = (score * 100).toFixed(2);
        return { index: item.index, score: percentage };
      });

      matchScores.sort((a, b) => b.score - a.score);

      let message = 'Similarity scores: <br />';
      matchScores.forEach((item) => {
        message += `${output[item.index]}: ${item.score}%, <br />----------------<br />`;
      });

      setUserMessage(message);
    } catch (error) {
      console.error('Error in match handler:', error);
      setUserMessage('An error occurred while calculating matches');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <>
      <Head>
        <title>Vector search online</title>
        <link rel="icon" href="/favicon.png" />
        <meta name="description" content="Vector search online is a tool that allows you to input a text and match it with a list of elements. We will show you the match score, along with which elements are the better matches." />
        
      </Head>
      <h1>Vector search online</h1>
      <p>
        On this page, you can input a text and match it with a list of elements. We will show you the match score, along with which elements are the better matches.
      </p>

      <div className="container" style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ width: '50%', padding: '0 1rem 1rem 0', display: 'flex', flexDirection: 'column' }}>
          <h3>Search query</h3>
          <p>Here you input what you are searching for</p>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            className='query-textarea'
          />
        </div>
        <div style={{ width: '50%' }}>
          <h3>Possible matches</h3>
          <p>Input the elements that the query might match with</p>
          {output.map((item, i) => (
            <div className='match-container' key={i}>
              <textarea
                value={item}
                onChange={(e) => handleOutputChange(i, e.target.value)}
                style={{ display: 'block' }}
              />
              <button onClick={() => removeOutputHandler(i)}>Remove</button>
              <br /><br /><br />
            </div>
          ))}
          <button onClick={addHandler}>Add another</button>
        </div>
      </div>

      <button
        onClick={matchHandler}
        disabled={isCalculating}
        style={{ 'width': '100%', 'margin': '2rem 0', 'fontSize': '2rem', 'background': '#ffde21' }}
      >
        {isCalculating ? 'Calculating...' : 'Match'}
      </button>

      <br /><br />
      <div style={{ 'background': '#FFF5BA', 'padding': '1rem' }}>
        {!userMessage && !response ? (
          <p>Results will appear here when they are ready </p>
        ) : null}
        <p dangerouslySetInnerHTML={{ __html: userMessage }}></p>
        <p dangerouslySetInnerHTML={{ __html: response }}></p>
      </div>
      <div>
        <h2>What is Vector Search?</h2>
        <p>
          Vector search represents a powerful shift in the way we find and retrieve information. Unlike traditional search engines that rely on keyword matching, vector search works by understanding the meaning behind data, transforming it into numerical representations, or vectors, and identifying patterns of similarity between them. This technique finds its strength in its ability to handle diverse types of data, from text to images, sound, and beyond. It excels at identifying semantically similar content, even when the exact words or phrases don't match.
        </p>

        <p>
          Imagine trying to search for yellow fruits. A traditional keyword-based search engine would only retrieve items that exactly match the phrase "yellow fruit." However, a vector search engine understands the context and meaning of your search. It could return results like "banana," "apple," or "orange" because those items share the concept of fruit, and some of them might even be associated with the color yellow. This ability to retrieve semantically similar results, rather than just exact matches, is what makes vector search so powerful.
        </p>

        <p>
          In the context of building modern AI applications with large language models (LLMs), vector search becomes particularly beneficial. Developers can leverage vector search to sift through user data and provide relevant context, enhancing the overall user experience. For instance, if a developer is creating an application that generates personalized nutrition plans based on user preferences and dietary restrictions, the application can utilize vector search to find relevant user data such as past meal choices, ingredient preferences, or health goals. Then, the LLM can generate tailored text that incorporates this context, offering users customized advice and suggestions that align with their individual needs.
        </p>


        <p>
          Imagine trying to search for yellow fruits. A traditional keyword-based search engine would only retrieve items that exactly match the phrase "yellow fruit." However, a vector search engine understands the context and meaning of your search. It could return results like "banana," "apple," or "orange" because those items share the concept of fruit, and some of them might even be associated with the color yellow. This ability to retrieve semantically similar results, rather than just exact matches, is what makes vector search so powerful.
        </p>

        <h2>How Does Vector Search Work?</h2>
        <p>
          The magic behind vector search lies in its ability to convert abstract concepts like text, images, or even audio into vectors, which are lists of numbers that represent those concepts in a mathematical space. These vectors capture not just the data itself but also its contextual meaning.
        </p>

        <p>Let’s break down how vector search works:</p>
        <ol>
          <li><strong>Converting Data into Vectors (Embeddings)</strong>: The first step in vector search is to convert data into vectors. Whether it's a product description, an image, or even an entire document, AI models (specifically embedding models) take the input and transform it into a vector. A vector, in this context, is essentially a list of numbers, where each number represents some aspect of the meaning of the data.</li>
          <li><strong>Capturing Semantic Meaning</strong>: These vectors are designed to capture semantic relationships between data points. For example, the embedding for "yellow fruit" would be numerically close to the embeddings for "banana," "apple," and "orange" because they are all fruits and are conceptually related to the color yellow.</li>
          <li><strong>Processing the Search Query</strong>: When a user inputs a search query like "yellow fruit," the system converts that query into a vector using the same embedding model. Whether you’re searching with a word, sentence, or even an image, the system generates a corresponding vector that represents the query in a comparable way to the vectors for stored data.</li>
          <li><strong>Finding the Nearest Vectors</strong>: With the search query now represented as a vector, the system looks through its stored vectors to find the ones closest to the search vector. For example, it would find the vectors for "banana," "orange," and "apple" because they are close to the meaning of "yellow fruit."</li>
          <li><strong>Ranking the Results</strong>: The system ranks the results by relevance, with "banana" possibly being ranked highest because bananas are typically yellow, while "apple" or "orange" may also appear as they are conceptually related to fruits and sometimes have a yellow hue (like certain apples or oranges).</li>
        </ol>

        <h2>How Does the Matching Function Work?</h2>
        <p>
          The core of vector search relies on how vectors are compared and ranked, and this is where cosine similarity comes into play. Cosine similarity is a mathematical method used to measure how alike two vectors are. To grasp this, we need to think of each vector as a point in space, with the direction and length of the vector representing the meaning of the data it encodes.
        </p>

        <ol>
          <li><strong>Takes Two Vectors</strong>: The system first takes two vectors, one representing the search query "yellow fruit" and one representing a potential match, such as "banana" or "apple."</li>
          <li><strong>Calculates the Angle Between Them</strong>: Cosine similarity calculates the angle between the two vectors. If the vectors point in almost the same direction (indicating a close semantic relationship), their cosine similarity will be high.</li>
          <li><strong>Scoring from -1 to 1</strong>: The cosine similarity score ranges from -1 to 1. A score of 1 means the vectors are perfectly aligned, indicating they are very similar. For instance, "yellow fruit" and "banana" might receive a high similarity score. A score closer to 0 or negative indicates less similarity, like "yellow fruit" and "carrot."</li>
          <li><strong>Interpreting the Scores</strong>: Higher cosine similarity scores suggest that the search query and the potential match are closely related in meaning. For example, if you search for "yellow fruit," "banana" might receive a higher cosine similarity score than "apple" or "orange" because bananas are commonly associated with yellow.</li>
          <li><strong>Returning Results</strong>: Based on these scores, the system ranks the potential matches. Results with the highest scores, like "banana," appear first, as they are deemed the most relevant to the query.</li>
        </ol>

        <h2>Practical Applications of Vector Search</h2>
        <p>
          Now that we’ve walked through the mechanics of vector search, it’s worth considering its broad range of applications. As our world becomes more data-rich, the need for more intelligent ways to search and retrieve information is growing.
        </p>

        <p>
          For instance, in <strong>e-commerce</strong>, vector search could enable a shopper to find products similar to what they have in mind. If someone uploads an image of a yellow jacket, vector search could retrieve jackets of similar styles and colors, even if they aren’t an exact match to the image. In a <strong>medical context</strong>, vector search can help doctors search for cases with similar symptoms or treatments by understanding the meaning behind patient records rather than just matching keywords.
        </p>

        <p>
          Whether in recommendation engines, multimedia applications, or natural language processing tasks, vector search represents a leap forward in our ability to retrieve data based on meaning rather than exact words. This capability opens up a world of possibilities for creating smarter, more intuitive systems that align with how humans naturally think and search.
        </p>
        <h2>Why is Vector Search Important?</h2>
        <p>
          In today's world, where data is constantly growing in both volume and complexity, the ability to find information quickly and accurately is crucial. Traditional search methods, which rely on keyword matching, often fall short when users don’t know the exact words to search for or when they are dealing with data types like images or audio files that don’t have natural text descriptions. This is where vector search comes in, as it focuses on the meaning of data rather than just surface-level keywords.
        </p>

        <p>
          By capturing the semantic meaning of the search query and the data it is trying to match, vector search allows for a more flexible and nuanced search experience. For instance, when you search for "yellow fruit," the system doesn’t just look for data that contains the exact phrase "yellow fruit." Instead, it can retrieve results like "banana," "apple," or "orange" based on their conceptual similarity to yellow fruit.
        </p>

        <p>
          This ability to understand and interpret meaning is essential in industries where the data isn't always easy to describe in precise terms. In creative industries, for example, users might search for images, videos, or audio that have a similar mood or theme rather than identical content. In a medical field, a doctor could search for patient records with similar symptoms without needing to match exact terminology. In e-commerce, shoppers can find items based on their style or function rather than relying on precise product descriptions.
        </p>

        <p>
          Vector search is also more resilient when it comes to different languages, dialects, and terminology. Two people may describe the same concept using completely different words, but vector search understands the underlying similarity. This makes it ideal for global applications where users may not share the same vocabulary but still want to find related information.
        </p>

        <h2>The Future of Vector Search</h2>
        <p>
          As AI and machine learning technologies continue to evolve, vector search will only become more sophisticated. Models that generate these vectors (called embeddings) will continue to improve, becoming more accurate at capturing even deeper nuances in meaning. This could allow future vector search systems to handle more complex queries, better understand user intent, and even process multimodal data (such as searching across text, images, and video all at once).
        </p>

        <p>
          Additionally, advancements in hardware and computational efficiency mean that vector search will become faster and more accessible. This will likely lead to widespread adoption across industries, from enhancing search engines and recommendation systems to powering virtual assistants, autonomous systems, and more. Whether you're trying to find the perfect yellow fruit, a specific song based on its vibe, or technical documentation with a similar concept, vector search will be a foundational tool for navigating an increasingly complex digital landscape.
        </p>

        <p>
          With its ability to transcend language barriers, understand the subtleties of meaning, and adapt to a variety of data types, vector search stands at the forefront of a new era in information retrieval. As data grows, so too does the need for smarter, more flexible ways to search and interact with it. Vector search offers that potential, changing not only how we search but also how we think about accessing and understanding the vast amounts of information around us.
        </p>


        <h4>I have a feature request</h4>
        <p>
          Please text me on Twitter @frederikbisp
        </p>
      </div>
    </>
  );
}