const jobs = [];

export const addJob = (job) => {
  jobs.push(job);
};

export const getRunningJobs = () => {
  return jobs.filter((job) => job && !job.complete);
};
