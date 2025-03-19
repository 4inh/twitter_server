// // import { getEmbedding } from "./utils/get-embeddings";
// import { pipeline } from "@xenova/transformers";
// // const pipeline = require("@xenova/transformers");
// async function getEmbedding(data) {
//     const embedder = await pipeline(
//         "feature-extraction",
//         "Xenova/nomic-embed-text-v1"
//     );
//     const results = await embedder(data, { pooling: "mean", normalize: true });
//     return Array.from(results.data);
// }

// async function run() {
//     console.log("runnn");

//     try {
//         console.log("staring get embedding");

//         // Generate an embedding using the function that you defined
//         const embedding = await getEmbedding("hello world");

//         console.log("embedding", embedding);
//     } catch (err) {
//         console.log(err.stack);
//     }
// }
// run();
