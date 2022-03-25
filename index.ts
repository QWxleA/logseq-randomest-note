import '@logseq/libs'
import SettingSchemaDesc from '@logseq/libs/dist/LSPlugin.user';

var choices = ["Entire graph","Limit to tag","No journal", "Only journal"]
const settingsTemplate:SettingSchemaDesc[] = [{
    key: "includeJournals",
    type: 'boolean',
    default: false,
    title: "include journals?",
    description: "Include journals in random page search.",
  },
 {
    key: "showTag",
    type: 'enum',
    enumChoices: choices,
    enumPicker: 'radio',
    default: choices[0],
    title: "What to show with the serendipity button?",
    description: "Choose between random  pages, journals, only by page-tag.",
 },
  {
    key: "searchTag",
    type: 'string',
    default: "seedling",
    title: "Specific tag to search?",
    description: "Limit search to this tag ('seedling' by default).",
  },
  {
    key: "coloredIcon",
    type: 'boolean',
    default: true,
    title: "Show colored icon?",
    description: "If yes, then it will be green when the 'tag' is selected",
  },
  {
    key: "excludePage",
    type: 'string',
    default: "templates",
    title: "Page to exclude from search",
    description: "Don't show anything from this page, defaults to templates",
  }
]
logseq.useSettingsSchema(settingsTemplate)

//var choices = ["Entire graph","Limit to tag","No journal", "Only journal"]
async function openRandomNote(ranType) {    
    const showJournal = ( logseq.settings.includeJournals || ranType == choices[3] )  ? true : false
    let queryType = `[?p :block/journal? ${showJournal}]`
    if ( ranType == choices[1] ) queryType = `[?p :block/tags [:block/name "${logseq.settings.searchTag}"]]`
    if ( ranType == choices[0] ) queryType = ""
    var query = `
    [:find (pull ?p [*])
    :where
    [_ :block/page ?p]
    [?p :block/name ?page]
    (not [(= ?page "templates")])
    ${queryType}
    ]`
  try {
    let ret = await logseq.DB.datascriptQuery(query)
    const pages = ret?.flat()
    if(pages && pages.length > 0) {
      const index = Math.floor(Math.random() * pages.length)
      logseq.App.pushState('page', {
        name: pages[index].name
      })
    }
  } catch (err) {
    console.log(err)
  }
}

async function onTemplate(uuid){
  //is block(uuid) on a template?
  try {
    const block = await logseq.Editor.getBlock(uuid)
    const checkTPL = (block.properties && block.properties.template != undefined) ? true : false
    const checkPRT = (block.parent != null && block.parent.id !== block.page.id)  ? true : false

    if (checkTPL === false && checkPRT === false) return false
    if (checkTPL === true )                       return true 
    return await onTemplate(block.parent.id) 

  } catch (error) { console.log(error) }
}

async function parseQuery(queryTag){
  // https://stackoverflow.com/questions/19156148/i-want-to-remove-double-quotes-from-a-string
  let query = `[:find (pull ?b [*])
  :where
  [?b :block/path-refs [:block/name "${queryTag.toLowerCase().trim().replace(/^["'](.+(?=["']$))["']$/, '$1')}"]]]`
  try { 
    let results = await logseq.DB.datascriptQuery(query) 
    let flattenedResults = results.map((mappedQuery) => ({
      uuid: mappedQuery[0].uuid['$uuid$'],
    }))
    let index = Math.floor(Math.random()*flattenedResults.length)
    const origBlock = await logseq.Editor.getBlock(flattenedResults[index].uuid, {
      includeChildren: true,
    });
    return `((${flattenedResults[index].uuid}))`
  } catch (error) {return false}
}

function main() {
  logseq.provideModel({
    handleRandomNote() {
      openRandomNote(logseq.settings.showTag)
  }})

  const provideStyle = () => logseq.provideStyle(` .ti-dice { color:  ${logseq.settings.coloredIcon ? "green" : "var(--ls-primary-text-color)"}; } `);

  logseq.onSettingsChanged((_updated) => {
    provideStyle()
  }); 
 
  logseq.Editor.registerSlashCommand('Insert Serendipity', async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :serendipity, quote}} `);
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    try {
      var [type, queryTag ] = payload.arguments
      if (type !== ':serendipity') return

      //is the block on a template?
      const templYN = await onTemplate(payload.uuid)        
      const block = await parseQuery(queryTag)
      // parseQuery returns false if no matching block can be found
      const msg = block ? `<span style="color: green">{{renderer ${payload.arguments} }}</span> (will run with template)` : `<span style="color: red">{{renderer ${payload.arguments} }}</span> (wrong tag?)`

      if (templYN === true || block === false) { 
          await logseq.provideUI({
          key: "serendipity",
          slot,
          template: `${msg}`,
          reset: true,
          style: { flex: 1 },
        })
        return 
      }
      else { await logseq.Editor.updateBlock(payload.uuid, block ) }  
    } catch (error) { console.log(error) }
  })

  logseq.App.registerCommandPalette({
    key: `serendipity-r`,
    label: `Show any random note`,
    keybinding: {
      mode: 'global',
      binding: 's r'
    }
  }, async () => { openRandomNote(choices[0]) }); 

  //FIXME can this be the tag?
  logseq.App.registerCommandPalette({
    key: `serendipity-t`,
    label: `Show random tagged note`,
    keybinding: {
      mode: 'global',
      binding: 's s'
    }
  }, async () => { openRandomNote(choices[1]) }); 

  logseq.App.registerCommandPalette({
    key: `serendipity-n`,
    label: `Show random note, anything but a journal`,
    keybinding: {
      mode: 'global',
      binding: 's n'
    }
  }, async () => { openRandomNote(choices[2]) }); 

  logseq.App.registerCommandPalette({
    key: `serendipity-j`,
    label: `Show random journal page`,
    keybinding: {
      mode: 'global',
      binding: 's j'
    }
  }, async () => { openRandomNote(choices[3]) }); 

  logseq.App.registerUIItem("toolbar", {
    key: 'logseq-serendipity-toolbar',
    template: `
      <span class="logseq-serendipity-toolbar flex flex-row">
        <a title="I'm Feeling Serendipitous" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-dice"></i>
        </a>
      </span>
    `,
  })
}

logseq.ready(main).catch(console.error)
