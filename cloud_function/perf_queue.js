const fs = require('fs').promises;

async function triggerGithubWorkflow({ owner, repo, workflow_id, ref, inputs }) {
      console.log(owner + ", "+
      repo + ", "+
      workflow_id + ", "+
      ref + ", "+
      inputs)
}

async function perf_queue_function() {
  try {

    const QUEUE_FILE = "./queueTest/perfTestQueue.json";
    const SERVICES_FILE = "./queueTest/activeServices.txt";
    const PARAM_FILE = "./queueTest/msgParams.json";
    const msgParamContent = await fs.readFile(PARAM_FILE, 'utf-8');
    const msgParams = JSON.parse(msgParamContent);

    //console.log('📥 Received test:', msgParams);

    // Download queue.json
    //const queueFile = storage.bucket(BUCKET_NAME).file(`${QUEUE_FOLDER}/${QUEUE_FILE}`);
    //const [queueContent] = await queueFile.download();
    //let queue = JSON.parse(queueContent.toString());
    const queueContent = await fs.readFile(QUEUE_FILE, 'utf-8');
    let queue = JSON.parse(queueContent);

    // Filter tests
    //const pendingQueue = queue.filter(entry => entry.executionStatus === 'pending');
    const pendingQueue = queue.filter(entry => entry.executionStatus === 'pending');
    const executingQueue = queue.filter(entry => entry.executionStatus === 'executing');

    // Sort queue by timestamp ascending
    pendingQueue.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

    // Find position of my test
    const myIndex = pendingQueue.findIndex(test => test.testName === msgParams.testName);
    if (myIndex === -1) {
      console.log(`Test ${msgParams.testName} not found in queue.`);
      process.exit(0);
      //throw new Error(`Test ${msgParams.testName} not found in queue`);
    }

    // Get active services
    //const servicesFile = storage.bucket(BUCKET_NAME).file(`${QUEUE_FOLDER}/${SERVICES_FILE}`);
    //const [servicesContent] = await servicesFile.download();
    // Create SET to avoid duplicates
    const activeServicesSet = new Set(); // Create SET to avoid duplicates

    // Loop each executing status test
    for (const test of executingQueue) {
      activeServicesSet.add(test.service);
      if (Array.isArray(test.dependencies)) {
        for (const dep of test.dependencies) {
          activeServicesSet.add(dep);
        }
      }
    }

    // Check tests older than mine
    const olderTests = pendingQueue.slice(0, myIndex);
    for (const test of olderTests) {
      const testServices = [test.service, ...(test.dependencies || [])];
      const isBlocked = testServices.some(s => activeServicesSet.has(s));

      if (!isBlocked) {
        // ⛔ An older test is free to run → I must wait
        console.log(`⏳ Older test ${test.testName} is ready to execute. Waiting my turn.`);
        process.exit(0);
        //throw new Error(`Older test ${test.testName} not blocked. Must wait.`);
      }
      // ✅ Older test is blocked → continue checking others
    }

    // Check my own services are free
    const myServices = [msgParams.service, ...(msgParams.dependencies || [])];
    const myBlocked = myServices.some(s => activeServicesSet.has(s));
    if (myBlocked) {
      console.log(`🔒 My test is blocked by active services. Retrying later.`);
      process.exit(0);
      //throw new Error(`My services are currently in use. Must wait.`);
    }

    // All checks passed  → trigger GitHub workflow
    console.log(`🚀 All clear, executing test ${msgParams.testName}...`);

    await triggerGithubWorkflow({
        owner: msgParams.cloudFunction_params.github_owner,
        repo: msgParams.cloudFunction_params.github_repo,
        workflow_id: msgParams.cloudFunction_params.github_exec_wf,
        ref: msgParams.cloudFunction_params.github_branch,
        inputs: msgParams.executionTest_inputs
    });

    // Mark my services as active
    //const updatedServices = [...new Set([...activeServices, ...myServices])];
    //console.log("updatedServices");
    //console.log(updatedServices);
    //await servicesFile.save(updatedServices.join(','));

    // Update my test in queue
    const updatedQueue = queue.map(entry => {
      if (entry.testName === msgParams.testName) {
        return { ...entry, executionStatus: 'executing' };
      }
      return entry;
    });

    // Upload updated queue.json
    //await queueFile.save(JSON.stringify(updatedQueue, null, 2));
    console.log("queue");
    console.log(updatedQueue);

    return; // Successful execution

  } catch (err) {
    console.error('❗ Error processing event:', err);
    process.exit(0);
    //throw err; // Force Pub/Sub retry
  }
}

perf_queue_function();