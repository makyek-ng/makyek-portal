import _ from 'lodash';
import Clipboard from 'clipboard';
import 'jquery-scroll-lock';
import makyek from 'libreversi';

import { NamedPage } from '../misc/PageLoader';
import Board from '../components/board';
import Notification from '../components/notification';
import { InfoDialog } from '../components/dialog';
import * as util from '../misc/Util';

const page = new NamedPage('round_detail', () => {

  const clipboard = new Clipboard('#stdin_left, #stdin_right');
  clipboard.on('success', () => {
    Notification.success('Data copied to clipboard!');
  });

  $('#stdin_left, #stdin_right').scrollLock();

  let roundSummary = null;

  const $roundSummary = $('#roundSummary');
  if ($roundSummary.length > 0) {
    roundSummary = JSON.parse($roundSummary.text());
    $('#roundText').text(`Exit caused by: ${roundSummary.exitCausedBy}`);
    if (roundSummary.currentBoard) {
      const board = new Board($('#roundBoard'), roundSummary.roundConfig);
      board.setBoard(roundSummary.currentBoard);
    }
  }

  let roundLogs = null;
  let roundCurrentStep = null;
  let roundMaxSteps = null;
  let roundBoard = null;
  let roundStdins = [[], []];

  const createStdinDialog = new InfoDialog({
    $body: $('.dialog__body--stdin > div'),
  });
  createStdinDialog.clear = function () {
    this.$dom.find('#stdin_left').val(roundStdins[0].join('\n'));
    this.$dom.find('#stdin_right').val(roundStdins[1].join('\n'));
    return this;
  };

  async function stepStart() {
    try {
      $('[name="start-step-toolbar"]').hide();
      $('#roundBoard').hide();
      $('#roundStepBoard').show();
      const logs = await util.get(location.pathname.replace(/\/$/, '') + '/logs', {}, 'text');
      roundLogs = _.filter(logs.split('\n').map(line => {
        if (line.length > 0 && line[0] == '{') {
          return JSON.parse(line);
        } else {
          return null;
        }
      }));
      roundBoard = new Board($('#roundStepBoard').empty(), roundSummary.roundConfig);
      roundMaxSteps = stepGetMaxSteps();
      $('[name="step-total"]').text(roundMaxSteps);
      stepJumpTo(0);
      $('[name="step-toolbar"]').show();
    } catch (err) {
      console.log(err);
      Notification.error('Failed to load logs for this round.');
      $('[name="start-step-toolbar"]').show();
      $('[name="step-toolbar"]').hide();
      $('#roundBoard').show();
      $('#roundStepBoard').hide();
    }
  }

  function stepGetMaxSteps() {
    let steps = 0;
    _.forEach(roundLogs, log => {
      if (log.type !== 'debug') {
        return;
      }
      if (log.data.action === 'place') {
        steps++;
      }
    });
    return steps;
  }

  function stepJumpTo(step) {
    if (step < 0 || step > roundMaxSteps || isNaN(step)) {
      step = roundCurrentStep;
    }
    let board = null, currentStep = 0;
    let lastPlace = null;
    let lastOption = null;
    roundStdins = [[], []];
    _.forEach(roundLogs, log => {
      if (log.type !== 'debug') {
        return;
      }
      if (log.data.action === 'sendRequest') {
        roundStdins[log.data.id].push(log.data.data);
      } else if (log.data.action === 'createBoard' || log.data.action === 'place') {
        if (currentStep > step) {
          return false;
        }
        if (log.data.action === 'createBoard') {
          board = new makyek.Board();
          currentStep++;
        } else if (log.data.action === 'place') {
          // position goes like this: N x0,y0 x1,y1 ...
          opertaion = log.data.position.split(' ');
          for (var i = 0; i < opertaion.length; i++) {
            if (i != 0 && i != opertaion.length - 1) {
              op0 = opertaion[i].split(',');
              x0 = op0[0];
              y0 = op0[1];
              op1 = opertaion[i + 1].split(',');
              x1 = op1[0];
              y1 = op1[1];
              board.placeAt(log.data.field, x0, y0, x1, y1);
            }
          }
          // board.placeAt(log.data.field, log.data.position[0], log.data.position[1], log.data.option);
          lastPlace = _.clone(log.data.position);
          lastOption = log.data.option;
          currentStep++;
        }
      }
    });
    roundCurrentStep = step;
    $('[name="step-current"]').val(roundCurrentStep);
    $('[name="step-prev"]').prop('disabled', step <= 0);
    $('[name="step-next"]').prop('disabled', step >= roundMaxSteps);
    $('#roundStepBoard .cell.active').removeClass('active');
    $('#roundStepBoard .cell.after-active').removeClass('after-active');
    if (lastPlace && lastOption !== null) {
      $(`#roundStepBoard .cell.pos-${lastPlace[0]}-${lastPlace[1]}`).addClass('active');
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      $(`#roundStepBoard .cell.pos-${lastPlace[0] + dirs[lastOption][0]}-${lastPlace[1] + dirs[lastOption][1]}`).addClass('after-active');
    }
    roundBoard.setBoard(board.board, board.order);
  }

  function stepPrev() {
    if (roundLogs === null) {
      return;
    }
    if (roundCurrentStep > 0) {
      stepJumpTo(roundCurrentStep - 1);
    }
  }

  function stepNext() {
    if (roundLogs === null) {
      return;
    }
    if (roundCurrentStep < roundMaxSteps) {
      stepJumpTo(roundCurrentStep + 1);
    }
  }

  function stepGo() {
    if (roundLogs === null) {
      return;
    }
    const step = parseInt($('[name="step-current"]').val());
    stepJumpTo(step);
  }

  $('[name="start-step"]').click(() => stepStart());
  $('[name="step-prev"]').click(() => stepPrev());
  $('[name="step-next"]').click(() => stepNext());
  $('[name="step-go"]').click(() => stepGo());
  $('[name="step-current"]').keypress(ev => {
    if (ev.which === 13) {
      stepGo();
    }
  });
  $('[name="step-copy"]').click(() => createStdinDialog.clear().open());
});

export default page;
