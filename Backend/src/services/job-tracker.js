const jobs = [];

const addJob = (job) => {
  jobs.push(job);
};

const getRunningJobs = () => {
  return jobs.filter(job => job && !job.complete);
};

module.exports = {
  addJob,
  getRunningJobs
};

