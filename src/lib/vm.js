// The default language for menus.
const DVD_MENU_LANGUAGE = 'en';

// The default language for audio.
const DVD_AUDIO_LANGUAGE = 'en';

// The default language for subpictures.
const DVD_SPU_LANGUAGE = 'en';

// The parental management country code.
const COUNTRY_CODE = 'US';

// Audio stream number
const AST_REG = 1;
// Subpicture stream number
const SPST_REG = 2;
// Angle number
const AGL_REG = 3;
// Title Track Number
const TTN_REG = 4;
// VTS Title Track Number
const VTS_TTN_REG = 5;
// PGC Number for this Title Track
//const TT_PGCN_REG = 6;
// Current Part of Title (PTT) number for (One_Sequential_PGC_Title)
const PTTN_REG = 7;
// Highlighted Button Number (btn nr 1 == value 1024)
const HL_BTNN_REG = 8;
// Parental Level
const PTL_REG = 13;

class Vm {
  instructions = null;
  vtt = [];
  dvd = null;
  domain = 0;
  sprm = new Array(24).fill(0);
  gprm = new Array(16).fill(0);
  set = null;
  operands = [];
  lang = 'en';
  hasMenus = false;

  constructor(instructions, dvd) {
    console.debug('Vm#constructor()', instructions);

    this.instructions = instructions.domains;
    this.vtt = instructions.tables.vtt;
    this.dvd = dvd;

    this.sprm[0] = DVD_MENU_LANGUAGE; // Player Menu Language code.
    this.sprm[AST_REG] = 15; // 15 why?
    this.sprm[SPST_REG] = 62; // 62 why?
    this.sprm[AGL_REG] = 1;
    this.sprm[TTN_REG] = 1;
    this.sprm[VTS_TTN_REG] = 1;
    //this.sprm[TT_PGCN_REG] = 0;
    this.sprm[PTTN_REG] = 1;
    this.sprm[HL_BTNN_REG] = 1 << 10;
    this.sprm[PTL_REG] = 15; // Parental Level
    this.sprm[12] = COUNTRY_CODE; // Parental Management Country Code
    this.sprm[14] = 0x0100; // Try Pan&Scan
    this.sprm[15] = 0x7CFC; // Audio capabilities - All defined audio types
    this.sprm[16] = DVD_AUDIO_LANGUAGE; // Initial Language Code for Audio
    this.sprm[18] = DVD_SPU_LANGUAGE; // Initial Language Code for Spu
    this.sprm[20] = 0x01; // Player Regional Code Mask. Region free!

    this.lang = this.getBestLanguage();
    this.hasMenus = this.instructions && this.instructions[0] &&
      this.instructions[0].menu_types &&
      this.instructions[0].menu_types[this.lang] &&
      this.instructions[0].menu_types[this.lang][2 /* Title */];
    this.dvd.hasMenus(this.hasMenus);

    // Override the menu button logic.
    this.dvd.onmenu = () => {
      let menu = null;
      if (this.instructions[this.domain].menu_types[this.lang][3 /* Root */]) {
        menu = this.instructions[this.domain].menu_types[this.lang][3 /* Root */];
      } else if (this.instructions[0].menu_types[this.lang][2 /* Title */]) {
        menu = this.instructions[0].menu_types[this.lang][2 /* Title */];
      }

      if (menu) {
        this.set = 'pgci_srp';
        this.operands = [menu.pgc];
        this.interpret();
      }
    };

    // Override the click on DVD UI buttons.
    this.dvd.onmenuclick = (target) => {
      const domain = parseInt(target.parentNode.dataset.domain, 10);
      const vob = parseInt(target.parentNode.dataset.vob, 10) - 1; // 0-based.
      const id = parseInt(target.dataset.id, 10);

      if (Number.isNaN(domain) || Number.isNaN(vob) || Number.isNaN(id)) {
        return;
      }

      console.debug(domain, vob, id);

      this.sprm[HL_BTNN_REG] = id * 0x0400; // << 10
      const btnCmd = this.instructions[domain].btn_cmd;

      if (!btnCmd || !btnCmd[vob] || !btnCmd[vob][id]) {
        console.error(`Missing button command for ${domain}, ${vob}, ${id}.`);
        return;
      }

      console.debug(btnCmd[vob][id]);

      this.executeInstruction(btnCmd[vob][id]);
      this.interpret();
    };
  }

  // Execute First Play PGC.
  start() {
    console.debug('Vm#start()');
    this.domain = 0;
    this.set = 'pgc';
    this.operands = [];
    this.interpret();
  }

  // Interpret a set of instructions.
  interpret() {
    requestAnimationFrame(this.loop);
  }

  loop = () => {
    if (!this.set) {
      return;
    }

    let instructions = {};

    switch (this.set) {
      case 'pgc':
        instructions = this.instructions[this.domain].pgc;

        this.executeInstruction(instructions);
        break;

      case 'pgciut':
        instructions = this.instructions[this.domain].pgciut[this.operands[0]];

        if (this.executeInstruction(instructions.pre)) {
          break;
        }

        this.dvd.playVideoByID(`video-${this.domain - 1}`);
        console.log(`this.dvd.playVideoByID('video-${this.domain - 1}');`);

        if (this.operands[1] !== undefined) {
          this.dvd.playChapterByIndex(this.operands[1]);
          console.log(`this.dvd.playChapterByIndex(${this.operands[1]});`);
        } else {
          this.dvd.play();
        }

        if (this.executeInstruction(instructions.cell)) {
          break;
        }

        this.dvd.once('ended', () => {
          this.executeInstruction(instructions.post);
          console.log(this.set);
          console.log(this.operands);

          this.interpret(); // Resume the loop.
        });
        return; // Stop this loop.
      //break;

      case 'pgci_srp':
        instructions = this.instructions[this.domain].pgci_srp[this.lang][this.operands[0]];

        if (this.executeInstruction(instructions.pre)) {
          break;
        }

        const id = `menu-${this.lang}-${this.domain}-${this.operands[0]}`;

        // Avoid infinite loops by aborting when opening the current menu.
        if (this.dvd.currentMenuId !== id) {
          this.dvd.playMenuByID(id);
          console.log(`this.dvd.playMenuByID('${id}');`);

          if (this.executeInstruction(instructions.cell)) {
            break;
          }

          // We assume all menus are static frames for now.
          this.executeInstruction(instructions.post);
        }
        break;

      case 'btn_cmd':
        // Called in click event listener, see above.
        break;

      default:
        console.error(`Unknown set of instruction: ${this.set}`);
        return;
    }

    requestAnimationFrame(this.loop);
  };

  /**
   * @param instructions
   * @return {boolean} Whether or not to continue execution of the branch.
   */
  executeInstruction(instructions) {
    console.debug('Vm#executeInstruction()');

    this.set = null; // Avoid infinite loops.
    let jump = false;
    let instructionId = 0;

    while (instructionId < instructions.length) {
      const instruction = instructions[instructionId];
      let bodies = [];

      if (Object.keys(instruction.cond).length === 0) {
        // If there is no conditions.
        // Both body1 and body are interpreted.
        // The first instruction is usually a set, so no need to call this.interpret() in between.
        bodies = [(instruction.body || instruction.body1)];
        if (instruction.body2 && Object.keys(instruction.body2).length) {
          bodies.push(instruction.body2);
        }
      } else if (this.evalCond(instruction.cond)) {
        // If the condition evaluates to true.
        bodies = [(instruction.body || instruction.body1)];
      } else {
        // In all other situations (condition evaluates to false).
        bodies = [instruction.body2];
      }

      bodies.forEach(body => {
        console.log('Vm#executeInstruction()', JSON.stringify(body, null, ' '));

        if (jump) {
          return;
        }

        switch (body.inst) {
          case 'NOP':
            break;

          case 'GoTo':
            // We decrement by one to account for counter increment later.
            instructionId = body.operand[0] - 1 - 1; // Make it 0-based.
            break;

          case 'set':
            this.setReg(body.left, body.right, body.operator);
            break;

          case 'LinkPGCN':
            this.set = 'pgci_srp';
            this.operands = [body.operand[0] - 1]; // Make it 0-based.
            jump = true;
            break;

          case 'LinkPGN': {
            // @todo Check that this is the intended behaviour.
            // Go to the indicated chapter.
            const tt = this.instructions[this.domain].ptt_table[body.operand[0] - 1][0];
            this.set = 'pgciut';
            this.operands = [tt.pgc - 1, tt.chapter];
            // Optionally highlights a specified button (0 = no highlight).
            if (body.operand[1] !== 0) {
              this.sprm[HL_BTNN_REG] = body.operand[1] << 10;
            }
            jump = true;
            break;
          }

          case 'JumpTT':
            const vtt = this.vtt[body.operand[0]];
            this.domain = vtt.domain;
            this.set = 'pgciut';
            this.operands = [vtt.pgc];
            jump = true;
            break;

          case 'JumpVTS_TT':
            const tt = this.instructions[this.domain].ptt_table[body.operand[0] - 1][0];
            this.set = 'pgciut';
            this.operands = [tt.pgc - 1, tt.chapter];
            jump = true;
            break;

          case 'JumpVTS_PTT':
            const ptt = this.instructions[this.domain].ptt_table[body.operand[0] - 1][body.operand[1] - 1];
            this.set = 'pgciut';
            this.operands = [ptt.pgc - 1, ptt.chapter];
            jump = true;
            break;

          case 'JumpSS_VMGM_PGC':
            this.set = 'pgci_srp';
            this.operands = [body.operand[0] - 1]; // Make it 0-based.
            jump = true;
            break;

          case 'JumpSS_VMGM_MENU':
            this.set = 'pgci_srp';
            const menu = this.instructions[this.domain].menu_types[this.lang][body.operand[0]];
            this.operands = [menu.pgc - 1]; // Make it 0-based.
            jump = true;
            break;

          case 'CallSS_VMGM_PGC':
            // @todo Implement me.
            jump = true;
            throw new Error('CallSS_VMGM_PGC not implemented.');
            break;

          case 'CallSS_VTSM':
            // @todo Implement me.
            throw new Error('CallSS_VTSM not implemented.');
            break;

          case 'Break':
            // @todo Implement me.
            throw new Error('Break not implemented.');
            break;

          default:
            console.error(`Unknown instruction type: ${body.inst}`);
            throw new Error('Unknown instruction type');
        }
      });

      instructionId++;
    }

    return jump;
  }

  evalCond(cond) {
    console.debug('Vm#evalCond()', cond);

    return true;
  }

  setReg(left, right, op) {
    switch (op) {
      case '=':
        switch (left.reg) {
          case 'gprm':
            this.gprm[left.id] = this.eval(right);

            console.log('gprm', this.gprm);
            break;

          case 'sprm':
            this.sprm[left.id] = this.eval(right);

            console.log('sprm', this.sprm);
            break;

          default:
            console.error(`Unknown type of register: ${left.reg}`);
        }
        break;

      default:
        console.error(`Unsupported operation: ${op}`);
    }
  }

  eval(val) {
    switch (typeof val) {
      case 'number':
        return val;

      case 'string':
        return parseInt(val, 10);

      case 'object':
        if (val.reg === 'sprm') {
          return this.sprm[val.id];
        }
        if (val.reg === 'gprm') {
          return this.gprm[val.id];
        }
        console.error(`Unknown type of register: ${val.reg}`);
        break;

      default:
        console.error('Unknown evaluated expression:', val);
    }
  }

  // Return the best language available according to user choice.
  getBestLanguage() {
    // We just return the first language available for now.
    return Object.keys(this.instructions[this.domain].pgci_srp)[0];
  }
}

export default Vm;
