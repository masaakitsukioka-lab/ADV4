// file://対応。scenario.jsonと同内容です。
window.SAIKACHI_SCENARIO = {
  "meta": {
    "version": "0.12.0",
    "scenario": "消えたスケッチ（仮）",
    "note": "本編の確定シナリオではありません",
    "id": "missing-sketch-demo",
    "saveRevision": 1
  },
  "initial": {
    "room": "classroom",
    "flags": {
      "shelfChecked": false,
      "noticeChecked": false,
      "foundClue": false,
      "deductionDone": false,
      "sketchDiscussed": false,
      "shelfDiscussed": false,
      "revisitNoticed": false
    }
  },
  "rooms": {
    "classroom": {
      "name": "美術教室",
      "targets": [
        {
          "id": "shelf",
          "name": "作品棚",
          "actions": [
            "しらべる"
          ]
        },
        {
          "id": "desk",
          "name": "机",
          "actions": [
            "しらべる"
          ]
        }
      ],
      "onEnter": [
        {
          "id": "classroom-revisit",
          "once": true,
          "when": {
            "all": [
              {
                "visits": {
                  "classroom": {
                    "min": 2
                  }
                }
              },
              {
                "flags": {
                  "noticeChecked": true,
                  "shelfChecked": true
                }
              },
              {
                "not": {
                  "flags": {
                    "foundClue": true
                  }
                }
              }
            ]
          },
          "set": {
            "revisitNoticed": true
          },
          "lines": [
            [
              "ハルキ",
              "美術教室に戻ってきた。掲示板のことが気になる。"
            ],
            [
              "サイジ",
              "作品棚をもう一度調べてみよう。"
            ]
          ]
        }
      ]
    },
    "corridor": {
      "name": "旧校舎の廊下",
      "targets": [
        {
          "id": "notice",
          "name": "掲示板",
          "actions": [
            "しらべる"
          ]
        },
        {
          "id": "door",
          "name": "扉",
          "actions": [
            "しらべる"
          ]
        }
      ]
    }
  },
  "investigations": {
    "shelf": [
      {
        "when": {
          "shelfChecked": false
        },
        "set": {
          "shelfChecked": true
        },
        "lines": [
          [
            "ハルキ",
            "作品棚には、空いている場所がある。"
          ],
          [
            "サイジ",
            "誰かが作品を動かしたのかもしれないな。"
          ]
        ],
        "id": "shelf-first",
        "once": true
      },
      {
        "when": {
          "all": [
            {
              "flags": {
                "shelfChecked": true,
                "noticeChecked": true
              }
            },
            {
              "not": {
                "flags": {
                  "foundClue": true
                }
              }
            }
          ]
        },
        "set": {
          "foundClue": true
        },
        "give": [
          "整理票の切れ端"
        ],
        "lines": [
          [
            "ハルキ",
            "棚の奥に小さな紙片が挟まっている。"
          ],
          [
            "サイジ",
            "整理票の切れ端だ。持っておこう。"
          ],
          [
            "ハルキ",
            "さっき調べたときは気づかなかった。"
          ]
        ],
        "id": "shelf-clue",
        "once": true
      },
      {
        "when": {
          "foundClue": true,
          "deductionDone": false
        },
        "lines": [
          [
            "サイジ",
            "作品棚と掲示板の情報が揃った。整理票を使って考えてみよう。"
          ]
        ]
      },
      {
        "lines": [
          [
            "ハルキ",
            "作品棚だ。新しい手がかりはなさそうだ。"
          ]
        ]
      }
    ],
    "notice": [
      {
        "set": {
          "noticeChecked": true
        },
        "lines": [
          [
            "ハルキ",
            "「作品整理日」の古い掲示が残っている。"
          ],
          [
            "サイジ",
            "美術教室の作品棚を、もう一度調べてみよう。"
          ]
        ]
      }
    ],
    "desk": [
      {
        "topic": "intro"
      }
    ],
    "door": [
      {
        "lines": [
          [
            "ハルキ",
            "古い木製の扉だ。今は開けられない。"
          ]
        ]
      }
    ]
  },
  "topics": {
    "intro": {
      "lines": [
        [
          "ハルキ",
          "机の上に古いスケッチがある。",
          "通常"
        ],
        [
          "サイジ",
          "何か気になることがあるか？",
          "疑問"
        ]
      ],
      "choices": [
        {
          "label": "スケッチについて聞く",
          "next": "sketch",
          "set": {
            "sketchDiscussed": true
          }
        },
        {
          "label": "作品棚について聞く",
          "next": "shelf",
          "set": {
            "shelfDiscussed": true
          }
        },
        {
          "label": "会話を終える",
          "next": "end"
        }
      ]
    },
    "sketch": {
      "lines": [
        [
          "ハルキ",
          "紙の端に小さな日付が書かれている。",
          "驚き"
        ],
        [
          "サイジ",
          "まだ事件との関係は分からないな。",
          "思案"
        ]
      ]
    },
    "shelf": {
      "lines": [
        [
          "ハルキ",
          "作品棚の空きが気になる。",
          "困惑"
        ],
        [
          "サイジ",
          "掲示板にも手がかりがあるかもしれない。",
          "確信"
        ]
      ]
    },
    "end": {
      "lines": [
        [
          "ハルキ",
          "ほかの場所も調べてみよう。",
          "納得"
        ]
      ]
    }
  },
  "questions": [
    {
      "q": "作品棚が空になった理由として、最も自然なのは？",
      "opts": [
        "作品が突然消えた",
        "整理作業で移動された可能性がある",
        "誰も作品を置いていなかった"
      ],
      "correct": 1
    },
    {
      "q": "その仮説を支える手がかりは？",
      "opts": [
        "机の削りかす",
        "古い木製の扉",
        "整理票の切れ端と作品整理日の掲示"
      ],
      "correct": 2
    }
  ]
};
