import { useEffect, useRef, useState } from "react";
import SceneManager from "./three-scene/SceneManager.js";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import OverlayShell from "./components/OverlayShell.jsx";
import MovementControls from "./components/MovementControls.jsx";
import DialogOverlay from "./components/DialogOverlay.jsx";
import ImageSequencePuzzle from "./components/ImageSequencePuzzle.jsx";
import SealMatchingPuzzle from "./components/SealMatchingPuzzle.jsx";
import ChoiceDialog from "./components/ChoiceDialog.jsx";
import FragmentSynthesis from "./components/FragmentSynthesis.jsx";
import ConfettiBurst from "./components/ConfettiBurst.jsx";
import { isWebGLAvailable } from "./utils/webgl.js";

const INITIAL_CAMERA_POSITION = [-89.0, -3.0, -24.6];
const INITIAL_TARGET = [-60.0, -2.8, -24.4];
const DEBUG_CALIBRATE = new URLSearchParams(window.location.search).has(
  "calibrate"
);
const DEBUG_HOTSPOTS = new URLSearchParams(window.location.search).has(
  "hotspots"
);
const ASSET_BASE = import.meta.env.BASE_URL;
const BOUNDS_POINTS = [
  [-44.35, -7.86, -37.84],
  [-44.35, 7.49, -37.84],
  [-44.35, 7.49, -10.74],
  [-44.35, -7.86, -10.74],
  [-98.94, -7.86, -37.84],
  [-98.94, -7.86, -10.74],
  [-98.94, 7.49, -37.84],
  [-98.94, 7.49, -10.74],
];
const PUZZLE_IMAGES = [
  { id: 1, label: "jiuselu1", src: `${ASSET_BASE}images/jiuselu1.jpg` },
  { id: 2, label: "jiuselu2", src: `${ASSET_BASE}images/jiuselu2.jpg` },
  { id: 3, label: "jiuselu3", src: `${ASSET_BASE}images/jiuselu3.jpg` },
  { id: 4, label: "jiuselu4", src: `${ASSET_BASE}images/jiuselu4.jpg` },
];
const PUZZLE_INITIAL_ORDER = [3, 1, 4, 2];
const PUZZLE_EXPECTED_ORDER = [1, 2, 3, 4];
const SEAL_TOKENS = [
  { id: "sincerity", label: "真诚印" },
  { id: "discipline", label: "守戒印" },
];
const SEAL_SLOTS = [
  { id: "south", label: "南壁" },
  { id: "north", label: "北壁" },
];
const SEAL_EXPECTED = {
  north: "sincerity",
  south: "discipline",
};
const CHOICE_OPTIONS = [
  {
    id: "A",
    text: "神鹿剥皮制衣乃佛法大忌，劝守佛规。",
  },
  {
    id: "B",
    text: "人无反复，不如水中浮木也。",
  },
  {
    id: "C",
    text: "后乃妲己，汝亦宠溺之，则国亡。",
  },
];
const DECISION_OPTIONS = [
  {
    id: "A",
    text: "将调达交给国王，按律治罪。",
  },
  {
    id: "B",
    text: "劝国王宽恕调达，给予其改过自新的机会。",
  },
];

function App() {
  const mountRef = useRef(null);
  const managerRef = useRef(null);
  const [webglReady, setWebglReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [debugMessage, setDebugMessage] = useState("");
  const [dialog, setDialog] = useState(null);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [sealPuzzleOpen, setSealPuzzleOpen] = useState(false);
  const [sealPuzzleKey, setSealPuzzleKey] = useState(0);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [synthesisOpen, setSynthesisOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [needsLandscape, setNeedsLandscape] = useState(false);

  const handleMoveStart = (direction) => {
    managerRef.current?.setMoveState(direction, true);
  };

  const handleMoveEnd = (direction) => {
    managerRef.current?.setMoveState(direction, false);
  };

  const handleDialogClose = () => {
    const callback = dialog?.onClose;
    setDialog(null);
    if (callback) {
      callback();
    }
  };

  const requestLandscape = () => {
    if (screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  };

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const update = () => {
      const isPortrait = query.matches;
      const isSmallScreen = window.innerWidth <= 900;
      if (isPortrait && isSmallScreen) {
        requestLandscape();
      }
      setNeedsLandscape(isPortrait && isSmallScreen);
    };

    update();

    if (query.addEventListener) {
      query.addEventListener("change", update);
    } else {
      query.addListener(update);
    }
    window.addEventListener("resize", update);

    return () => {
      if (query.removeEventListener) {
        query.removeEventListener("change", update);
      } else {
        query.removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const supported = isWebGLAvailable();
    setWebglReady(supported);

    if (!supported || !mountRef.current) {
      return undefined;
    }

    const manager = new SceneManager(mountRef.current, {
      cameraPosition: INITIAL_CAMERA_POSITION,
      targetPosition: INITIAL_TARGET,
      debug: DEBUG_CALIBRATE,
      boundsPoints: BOUNDS_POINTS,
      onHotspotClick: (hotspot) => {
        if (DEBUG_HOTSPOTS) {
          console.info("Hotspot clicked", hotspot);
        }
      },
    });

    managerRef.current = manager;
    manager.init();

    let northDone = false;
    let southDone = false;
    const tryUnlockSealSlot = () => {
      if (northDone && southDone) {
        manager.setHotspotActive("seal-slot", true);
      }
    };

    const isEditableTarget = (target) => {
      if (!target) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tagName = target.tagName?.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select";
    };

    const getMoveDirectionFromKey = (key) => {
      if (!key) {
        return null;
      }
      switch (key.toLowerCase()) {
        case "w":
          return "forward";
        case "s":
          return "backward";
        case "a":
          return "left";
        case "d":
          return "right";
        default:
          return null;
      }
    };

    const handleWindowBlur = () => {
      manager.stopMovement();
    };

    const handleMoveKeydown = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const direction = getMoveDirectionFromKey(event.key);
      if (!direction) {
        return;
      }
      event.preventDefault();
      manager.setMoveState(direction, true);
    };

    const handleMoveKeyup = (event) => {
      const direction = getMoveDirectionFromKey(event.key);
      if (!direction) {
        return;
      }
      event.preventDefault();
      manager.setMoveState(direction, false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        manager.stopMovement();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleMoveKeydown);
    window.addEventListener("keyup", handleMoveKeyup);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (DEBUG_HOTSPOTS) {
      manager.addHotspot({
        id: "debug-center",
        position: INITIAL_TARGET,
        radius: 0.8,
        type: "debug",
        label: "Center marker",
      });
    }

    manager.addHotspot({
      id: "easter-egg",
      position: [-44.35, -2.88, -27.72],
      radius: 0.4,
      type: "easter-egg",
      label: "Easter egg",
      active: true,
      steadyOnClick: true,
      onClick: () => {
        const openCulturalDialog = () => {
          setDialog({
            title: "文化传承之路",
            body:
              "游戏作为年轻人最喜爱的数字载体之一，正成为传统文化传承的创新通道。像 “遇见神鹿” 这样的联动，不仅让沉睡千年的壁画以动态形式走进指尖，更通过沉浸式体验让年轻人主动了解九色鹿背后的故事与敦煌艺术的价值。当玩家操控瑶在峡谷中奔跑，看到的不仅是精美的皮肤特效，更是敦煌壁画中跨越时空的真善美。期待未来有更多游戏 IP 加入文化传承行列，让敦煌的飞天、神鹿、经变画等元素，在数字世界中绽放新的光彩，让千年文明在年轻一代心中生根发芽。",
            variant: "orange",
          });
        };

        setDialog({
          title: "小彩蛋",
          imageSrc: `${ASSET_BASE}images/yujian.jpg`,
          imageAlt: "Dunhuang collab",
          body:
            "敦煌莫高窟与游戏 IP 联动频繁，以王者荣耀 “遇见” 系列最具代表性，另有逆水寒手游、植物大战僵尸 2 等推出敦煌主题内容，用数字技术活化千年壁画艺术。\n王者荣耀・瑶 - 遇见神鹿：九色鹿的数字新生\n瑶的 “遇见神鹿” 是王者荣耀与敦煌研究院二次联动的限定皮肤，灵感源自莫高窟 257 窟北魏《鹿王本生图》壁画。皮肤以壁画中九色鹿为核心原型，采用蜜色与青绿色为主色调，还原神鹿 “毛具九色、角白如雪” 的经典形象。设计上，瑶的裙摆融入壁画云纹与卷草纹，鹿角点缀壁画特有的矿物质颜料质感，技能特效中呈现九色光晕与莲花纹样，局内音效融合敦煌古乐元素，行走时还会留下蹄印与花瓣痕迹。皮肤故事延续九色鹿 “以爱守护” 的内核，将壁画中善恶因果的寓言转化为游戏中守护队友的技能设定，让玩家在对战中感受敦煌艺术的美学与精神。",
          primaryLabel: "确定",
          onPrimary: openCulturalDialog,
          onClose: openCulturalDialog,
        });
      },
    });

    manager.addHotspot({
      id: "intro-marker",
      position: [-73.22, -1.21, -21.63],
      radius: 0.7,
      type: "intro",
      label: "Identity marker",
      onClick: () => {
        setDialog({
          title: "新手引导",
          body:
            "你好，数字修复师。欢迎来到敦煌莫高窟第257窟，很遗憾洞窟数字叙事核心已失活，请先找到洞窟的「身份铭牌」，唤醒基础数字权限。",
        });
        manager.setHotspotActive("pillar-plaque", true);
      },
    });

    manager.addHotspot({
      id: "pillar-plaque",
      position: [-73.22, -1.64, -27.79],
      radius: 0.7,
      type: "plaque",
      label: "Pillar plaque",
      active: false,
      onClick: () => {
        setDialog({
          title: "身份铭牌",
          imageSrc: `${ASSET_BASE}images/center-pillar.jpg`,
          imageAlt: "Center pillar",
          body:
            "莫高窟第257窟开凿于北魏时期，是莫高窟早期中心塔柱窟的代表。洞窟形制为中心塔柱窟，主室中心设方柱，四壁绘有大量佛本生故事画，其中《九色鹿本生》是中国古代壁画的经典之作，具有极高的艺术与历史价值。",
          onClose: () => {
            setDialog({
              title: "基础权限已解锁",
              body: "恭喜您解锁基础权限，请前往西壁（中心柱后面）继续探秘。",
              onClose: () => {
                manager.setHotspotActive("west-clue", true);
              },
            });
          },
        });
      },
    });

    manager.addHotspot({
      id: "west-clue",
      position: [-44.35, -2.43, -25.7],
      radius: 0.7,
      type: "clue",
      label: "West wall clue",
      active: false,
      onClick: () => {
        setDialog({
          title: "记忆碎片线索",
          body:
            "叙事核心的第一块碎片，藏在九色鹿故事的缘起之处，请还原故事开端，找回第一块记忆碎片。",
          onClose: () => {
            manager.setHotspotActive("west-sequence", true);
          },
        });
      },
    });

    manager.addHotspot({
      id: "west-sequence",
      position: [-44.35, -2.66, -36.74],
      radius: 0.8,
      type: "sequence",
      label: "West wall sequence",
      active: false,
      onClick: () => {
        setPuzzleKey((value) => value + 1);
        setPuzzleOpen(true);
      },
    });

    manager.addHotspot({
      id: "betrayal-lead",
      position: [-44.35, -4.53, -32.55],
      radius: 0.8,
      type: "betrayal",
      label: "Betrayal lead",
      active: false,
      onClick: () => {
        setDialog({
          title: "剧情提示--调达的背叛",
          body:
            "调达被九色鹿救起后，答应了九色鹿不去向世人泄露她的秘密。但是面对国王丰厚的悬赏，他最终还是选择了背叛诺言。他的誓言与谎言，需在南北两壁找到印证，找回第二块记忆碎片。",
          variant: "red",
          onClose: () => {
            setDialog({
              title: "下一步指引",
              body: "请分别前往南壁和北壁（即两侧的壁画）寻找线索与道具，收集两个印信。",
              onClose: () => {
                manager.setHotspotActive("intro-marker", false);
                manager.setHotspotActive("pillar-plaque", false);
                manager.setHotspotActive("north-clue", true);
                manager.setHotspotActive("south-clue", true);
              },
            });
          },
        });
      },
    });

    manager.addHotspot({
      id: "north-clue",
      position: [-70.62, -5.97, -10.74],
      radius: 0.8,
      type: "north-clue",
      label: "North wall clue",
      active: false,
      onClick: () => {
        setDialog({
          title: "获得线索【不妄语者，方得见真】",
          body:
            "北壁《须摩提女因缘故事》。须摩提女嫁外道之家，因拒拜梵志遭迫害，焚香请佛。佛陀率弟子以神通赴会，度化满城，彰显信仰之力。故事见于敦煌莫高窟第257窟北魏壁画，以横卷式连环画呈现。",
          variant: "blue",
          onClose: () => {
            setDialog({
              title: "解锁道具【真诚印】",
              body: "已获得真诚印，可去南壁寻找或回西壁进行下一步验证。",
              variant: "blue",
              onClose: () => {
                northDone = true;
                manager.setHotspotActive("betrayal-lead", false);
                tryUnlockSealSlot();
              },
            });
          },
        });
      },
    });

    manager.addHotspot({
      id: "south-clue",
      position: [-66.23, -5.85, -37.84],
      radius: 0.8,
      type: "south-clue",
      label: "South wall clue",
      active: false,
      onClick: () => {
        setDialog({
          title: "获得线索【守诺者，心不欺暗】",
          body:
            "南壁《沙弥守戒自杀因缘故事》。讲述少年沙弥入施主家取饭时，遭美貌少女强逼破戒。为守佛门清规，沙弥以剃刀自刎明志，鲜血满地。少女悔恨自残，父亲向国王赎罪。国王感其贞烈，以隆重仪式火化沙弥并建塔供养。故事通过极端抉择展现信仰纯度，警示僧众严守戒律，同时折射北魏时期佛教对出家者道德规范的强化。敦煌壁画中以横卷连环画呈现，人物情态细腻，将暴力转化为崇高宗教仪式，成为佛教艺术中“戒律崇高美”的典范。",
          variant: "blue",
          onClose: () => {
            setDialog({
              title: "解锁道具【守戒印】",
              body: "已获得守戒印，可去北壁寻找或回西壁进行下一步验证。",
              variant: "blue",
              onClose: () => {
                southDone = true;
                tryUnlockSealSlot();
              },
            });
          },
        });
      },
    });

    manager.addHotspot({
      id: "seal-slot",
      position: [-44.35, -3.25, -21.72],
      radius: 0.9,
      type: "seal-slot",
      label: "Seal slots",
      active: false,
      onClick: () => {
        setSealPuzzleKey((value) => value + 1);
        setSealPuzzleOpen(true);
      },
    });

    manager.addHotspot({
      id: "truth-choice",
      position: [-44.35, -3.88, -27.66],
      radius: 0.9,
      type: "truth-choice",
      label: "Truth choice",
      active: false,
      onClick: () => {
        setChoiceError("");
        setChoiceOpen(true);
      },
    });

    manager.addHotspot({
      id: "final-decision",
      position: [-44.35, -5.43, -32.16],
      radius: 0.9,
      type: "final-decision",
      label: "Final decision",
      active: false,
      onClick: () => {
        setDecisionOpen(true);
      },
    });

    manager.addHotspot({
      id: "fragment-synthesis",
      position: [-73.22, -5.45, -24.19],
      radius: 0.9,
      type: "synthesis",
      label: "Fragment synthesis",
      active: false,
      onClick: () => {
        setSynthesisOpen(true);
      },
    });

    let canceled = false;

    let clearMessageTimer = null;
    const handleKeydown = (event) => {
      if (!DEBUG_CALIBRATE || event.key.toLowerCase() !== "c") {
        return;
      }
      const viewState = manager.getViewState();
      if (!viewState) {
        return;
      }

      const payload = JSON.stringify(viewState, null, 2);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(payload).catch(() => {
          console.info(payload);
        });
        setDebugMessage("View state copied to clipboard");
      } else {
        console.info(payload);
        setDebugMessage("View state logged to console");
      }

      if (clearMessageTimer) {
        window.clearTimeout(clearMessageTimer);
      }
      clearMessageTimer = window.setTimeout(() => {
        setDebugMessage("");
      }, 2400);
    };

    if (DEBUG_CALIBRATE) {
      window.addEventListener("keydown", handleKeydown);
    }

    manager
      .loadModel(`${ASSET_BASE}model/dunhuang.glb`, (nextProgress) => {
        if (!canceled) {
          setProgress(nextProgress);
        }
      })
      .then(() => {
        if (!canceled) {
          setProgress(100);
          setLoading(false);
        }
        manager.start();
      })
      .catch((error) => {
        console.error("Model load failed", error);
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
      if (DEBUG_CALIBRATE) {
        window.removeEventListener("keydown", handleKeydown);
      }
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleMoveKeydown);
      window.removeEventListener("keyup", handleMoveKeyup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (clearMessageTimer) {
        window.clearTimeout(clearMessageTimer);
      }
      manager.dispose();
    };
  }, []);

  return (
    <div className="app-root">
      {needsLandscape ? (
        <div className="orientation-overlay" role="presentation">
          <div className="orientation-card">
            <div className="orientation-title">请横屏体验</div>
            <div className="orientation-body">
              为保证热点与画面一致，请将手机横屏。
            </div>
            <button
              className="orientation-button"
              type="button"
              onClick={requestLandscape}
            >
              进入横屏
            </button>
          </div>
        </div>
      ) : null}
      {webglReady ? (
        <div className="scene-root" ref={mountRef} />
      ) : (
        <div className="fallback-root">
          <div className="fallback-card">
            <div className="fallback-title">WebGL not available</div>
            <div className="fallback-body">
              Please open on a device with WebGL support or use the 2D fallback
              view.
            </div>
          </div>
        </div>
      )}
      <OverlayShell debug={DEBUG_CALIBRATE} message={debugMessage} />
      {webglReady ? (
        <MovementControls
          onMoveStart={handleMoveStart}
          onMoveEnd={handleMoveEnd}
        />
      ) : null}
      {dialog ? (
        <DialogOverlay
          title={dialog.title}
          body={dialog.body}
          imageSrc={dialog.imageSrc}
          imageAlt={dialog.imageAlt}
          variant={dialog.variant}
          primaryLabel={dialog.primaryLabel}
          onPrimary={dialog.onPrimary}
          onClose={handleDialogClose}
        />
      ) : null}
      {puzzleOpen ? (
        <ImageSequencePuzzle
          key={puzzleKey}
          images={PUZZLE_IMAGES}
          initialOrder={PUZZLE_INITIAL_ORDER}
          expectedOrder={PUZZLE_EXPECTED_ORDER}
          title="还原九色鹿故事顺序"
          instruction="相信你一定听说过九色鹿的故事，请你根据回忆或者经验，将下列图片按故事的正确发展顺序排位。"
          onClose={() => setPuzzleOpen(false)}
          onComplete={() => {
            setPuzzleOpen(false);
            setDialog({
              title: "第一块记忆碎片【救度】",
              body:
                "恭喜你成功还原了第一块记忆碎片！科普：九色鹿本生故事源于三国支谦译《佛说九色鹿经》，讲佛陀前世救溺水者反被出卖，宣扬善恶有报。北魏壁画《鹿王本生图》以横卷式连环画呈现，两端向中心构图，高潮居中；用凹凸法渲染，色彩对比强烈，融合中西艺术，存于敦煌莫高窟。",
              variant: "gold",
              onClose: () => {
                managerRef.current?.setHotspotActive("west-clue", false);
                managerRef.current?.setHotspotActive("west-sequence", false);
                managerRef.current?.setHotspotActive("betrayal-lead", true);
              },
            });
          }}
        />
      ) : null}
      {sealPuzzleOpen ? (
        <SealMatchingPuzzle
          key={sealPuzzleKey}
          tokens={SEAL_TOKENS}
          slots={SEAL_SLOTS}
          expected={SEAL_EXPECTED}
          title="印信归位"
          instruction="拖拽印信到对应的壁面凹槽。"
          onClose={() => setSealPuzzleOpen(false)}
          onComplete={() => {
            setSealPuzzleOpen(false);
            setDialog({
              title: "第二块记忆碎片【背叛】",
              body:
                "恭喜你成功还原了第二块记忆碎片！佛教本生故事宣扬佛陀前世修行中的慈悲与牺牲，因缘故事阐释现世因果报应。以横卷式连环画呈现，融合印度佛教艺术与中原绘画技法，体现丝路文化交融。北魏时期，佛教随丝绸之路传入敦煌，统治者崇佛促开窟造像，将佛理与世俗教化结合，推动佛教艺术本土化，形成独特的敦煌风格。",
              variant: "gold",
              onClose: () => {
                managerRef.current?.setHotspotActive("north-clue", false);
                managerRef.current?.setHotspotActive("south-clue", false);
                setDialog({
                  title: "故事高潮",
                  body:
                    "调达背叛了誓言，为国王的军队带路去抓九色鹿，不久军队发现并包围了九色鹿，在这危急关头，请你帮助九色鹿还原真相，完成叙事核心闭环，找回最关键的记忆碎片。",
                   variant: "red",
                  onClose: () => {
                    managerRef.current?.setHotspotActive(
                      "truth-choice",
                      true
                    );
                  },
                });
              },
            });
          }}
        />
      ) : null}
      {choiceOpen ? (
        <ChoiceDialog
          title="根据到现在了解的信息，选择九色鹿真正的澄清。"
          body="请选择最符合九色鹿的陈述。"
          options={CHOICE_OPTIONS}
          status={choiceError}
          onClose={() => setChoiceOpen(false)}
          onSelect={(choiceId) => {
            if (choiceId === "B") {
              setChoiceError("");
              setChoiceOpen(false);
              setDialog({
                title: "澄清正确",
                body:
                  "九色鹿面对国王时并未乞求饶命，而是理直气壮地陈述事实，揭露调达的背信弃义，以“人无反复，不如水中浮木”的比喻直指人性根本，最终使国王惭愧并放弃捕杀。A选项对应守戒，无中生有易混淆，C选项亦无中生有，原文并没有说如妲己，王后只是贪欲过强。",
                variant: "orange",
                onClose: () => {
                  setDialog({
                    title: "获得线索【真相】",
                    body:
                      "你帮助九色鹿向国王还原了真相，成功逃过一劫，现在要做的是处理背叛者调达，解锁第三块记忆碎片。",
                    variant: "blue",
                    onClose: () => {
                      managerRef.current?.setHotspotActive(
                        "seal-slot",
                        false
                      );
                      managerRef.current?.setHotspotActive(
                        "truth-choice",
                        false
                      );
                      managerRef.current?.setHotspotActive(
                        "final-decision",
                        true
                      );
                    },
                  });
                },
              });
            } else {
              setChoiceError(
                "答案不正确，再想一想九色鹿如何在国王面前揭示真相。"
              );
            }
          }}
        />
      ) : null}
      {decisionOpen ? (
        <ChoiceDialog
          title="你的抉择"
          body="按照律法，应该要严惩调达，调达此刻也知罪，并恳求你放一条生路。现在请你选择你的做法（此题没有对错之分，双结局）"
          options={DECISION_OPTIONS}
          onClose={() => setDecisionOpen(false)}
          onSelect={(choiceId) => {
            setDecisionOpen(false);
            if (choiceId === "A") {
              setDialog({
                title: "【因果结局】",
                body: "对应壁画原结局，调达最终满身恶疮、自食恶果。",
                imageSrc: `${ASSET_BASE}images/Aphoto.jpg`,
                imageAlt: "Outcome A",
                variant: "purple",
                onClose: () => {
                  setDialog({
                    title: "第三块核心记忆碎片【昭雪】",
                    body:
                      "恭喜你成功还原了第三块记忆碎片！九色鹿故事的文化内核源于佛本生思想，融合善恶有报的道德观与人性反思。九色鹿象征至善与牺牲，其救人与被出卖的对比，揭露人性在利益前的脆弱，警示“善良需带锋芒”。敦煌壁画以中西合璧艺术强化此寓言，将佛理世俗化。其精神本质是：以美善救赎恶念，用智慧守护仁心，在道德困境中坚守本真。故事至今仍叩问现代人的价值抉择——如何在功利社会中平衡慈悲与清醒。",
                    variant: "gold",
                    onClose: () => {
                      setDialog({
                        title: "恭喜你已经集齐3块记忆碎片！",
                        body: "请前往中心柱正面做最后的记忆找回。",
                        variant: "green",
                        onClose: () => {
                          managerRef.current?.setHotspotActive(
                            "fragment-synthesis",
                            true
                          );
                        },
                      });
                    },
                  });
                },
              });
            } else {
              setDialog({
                title: "【慈悲结局】",
                body: "契合九色鹿故事的佛教慈悲内核。",
                imageSrc: `${ASSET_BASE}images/Bphoto.jpg`,
                imageAlt: "Outcome B",
                variant: "white",
                onClose: () => {
                  setDialog({
                    title: "第三块核心记忆碎片【昭雪】",
                    body:
                      "恭喜你成功还原了第三块记忆碎片！九色鹿故事的文化内核源于佛本生思想，融合善恶有报的道德观与人性反思。九色鹿象征至善与牺牲，其救人与被出卖的对比，揭露人性在利益前的脆弱，警示“善良需带锋芒”。敦煌壁画以中西合璧艺术强化此寓言，将佛理世俗化。其精神本质是：以美善救赎恶念，用智慧守护仁心，在道德困境中坚守本真。故事至今仍叩问现代人的价值抉择——如何在功利社会中平衡慈悲与清醒。",
                    variant: "gold",
                    onClose: () => {
                      setDialog({
                        title: "恭喜你已经集齐3块记忆碎片！",
                        body: "请前往中心柱正面完成最后的记忆拼接。",
                        variant: "green",
                        onClose: () => {
                          managerRef.current?.setHotspotActive(
                            "fragment-synthesis",
                            true
                          );
                        },
                      });
                    },
                  });
                },
              });
            }
          }}
        />
      ) : null}
      {synthesisOpen ? (
        <FragmentSynthesis
          title="合成碎片"
          fragments={["救度", "背叛", "昭雪"]}
          description="叙事碎片已补全，请点击合成按钮。"
          onSynthesize={() => {
            setSynthesisOpen(false);
            setShowConfetti(true);
            setDialog({
              title: "合成完成",
              body:
                "恭喜你成功激活洞窟数字叙事核心！你还原的不仅是千年前画工的落笔时序，更是敦煌营造的匠心脉络。数字技术让千年壁画突破时空壁垒，每一次探索，都是对文化遗产的新生与传承。现在为你生成了通关证书，感谢你的参与！随后可以自由游览洞窟，欢迎来到敦煌莫高窟257窟的数字世界！",
              variant: "gold",
              onClose: () => {
                setDialog({
                  title: "通关证书",
                  imageSrc: `${ASSET_BASE}images/zhengshu.jpg`,
                  imageAlt: "Certificate",
                  variant: "gold"
                });
              },
            });
          }}
        />
      ) : null}
      {showConfetti ? (
        <ConfettiBurst onComplete={() => setShowConfetti(false)} />
      ) : null}
      {webglReady && loading ? <LoadingOverlay progress={progress} /> : null}
    </div>
  );
}

export default App;
