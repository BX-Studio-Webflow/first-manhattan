import { JobBoardController } from '$utils/job-board';

window.Webflow ||= [];
window.Webflow.push(async () => {
  const root = document.querySelector('[dev-target="career-list"]');
  if (root) {
    const jobBoard = new JobBoardController();
    await jobBoard.init();
    window.refreshJobBoard = () => jobBoard.refresh();
  }
});
