  // Wait for migroot object to load and then fetch data
  async function waitForMigroot() {
    const timeout = 10000; // maximum time to wait: 10 seconds
    const interval = 100; // check every 100 ms
    let waited = 0;

    if (typeof CONFIG === 'undefined') {
      console.warn("CONFIG is not defined. Skipping Migroot initialization.");
      return;
    }

    while (typeof window.Migroot !== 'function') {
      if (waited >= timeout) {
        throw new Error("Migroot did not load within the expected time.");
      }
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }

    window.mg = new Migroot(CONFIG);
  }


  function waitForOutseta() {
    return new Promise((resolve, reject) => {
      const checkOutseta = setInterval(() => {
        if (typeof Outseta !== 'undefined') {
          clearInterval(checkOutseta);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkOutseta);
        reject(new Error('Outseta loading error'));
      }, 5000);
    });
  };


async function initDashboard() {
  try {
    const allowedPages = ['app', 'staging']; // all pages started from app
    const currentPath = window.location.pathname.split('/').filter(Boolean)[0];
    if (!allowedPages.includes(currentPath)) {
      return;
    }

    if (typeof preloaderStart === 'function') {
    	preloaderStart();
    }

    if (!window.mg) {
      throw new Error("Migroot instance (window.mg) is not initialized.");
    }

    await window.mg.init_mg({
      boardId: null,
      callback: (result) => {
        preloaderFinish();
        console.log("Dashboard initialized successfully", result);
      }
     });

  } catch (error) {
    if (typeof preloaderError === 'function') {
      preloaderError(error.message || error);
    }
    console.warn("Migroot init stopped:", error);
  }
    if (typeof preloaderError === 'function') {
      preloaderError('oops...something happens');
    }
}

window.onload = async function () {
    try {
        await waitForOutseta();
        await waitForMigroot();
		await initDashboard();
    } catch (error) {
        console.error("Error during dashboard initializing on window on load:", error);
    }
};