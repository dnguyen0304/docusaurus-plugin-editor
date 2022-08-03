import fs from 'fs/promises';

import pluginContentDocs from '@docusaurus/plugin-content-docs';
import { docuHash } from '@docusaurus/utils';

import type {
    LoadedContent,
    PluginOptions
} from '@docusaurus/plugin-content-docs';
import type { LoadContext, Plugin, RouteConfig } from '@docusaurus/types';

// See https://github.com/facebook/docusaurus/blob/01ac2e0fcaccaf469992f93a0e8bf04e61cf850e/packages/docusaurus-utils/src/pathUtils.ts#L93
const aliasedSitePathPrefix: string = '@site';

export default async function pluginEditor(
    context: LoadContext,
    options: PluginOptions,
): Promise<Plugin<LoadedContent>> {
    const wrappedPlugin = await pluginContentDocs(context, options);

    return {
        // TODO(dnguyen0304): Investigate how to specify a different plugin name
        // There are hard-coded references to specific plugin names.
        // See https://github.com/facebook/docusaurus/blob/7ab2bd32342496f3f7373bc67d03a0da0eeffa40/packages/docusaurus-plugin-content-docs/src/client/index.ts#L89
        name: wrappedPlugin.name,

        extendCli(cli) {
            wrappedPlugin.extendCli!(cli);
        },

        getPathsToWatch() {
            return wrappedPlugin.getPathsToWatch!();
        },

        async loadContent() {
            return wrappedPlugin.loadContent!();
        },

        async contentLoaded({ content, allContent, actions }) {
            if (content.loadedVersions.length > 1) {
                throw new Error(
                    'Loading multiple versions is not yet implemented.'
                )
            };

            const { siteDir } = context;
            const { docItemComponent } = options;

            const pathToContentPath: { [path: string]: string } = {}

            for (let i = 0; i < content.loadedVersions[0].docs.length; i++) {
                const doc = content.loadedVersions[0].docs[i];
                const resolvedPath = doc.source.replace(
                    aliasedSitePathPrefix,
                    siteDir,
                );
                const fileContents = await fs.readFile(
                    resolvedPath,
                    {
                        encoding: 'utf8'
                    },
                );
                // Variance such as a prefix is necessary to avoid namespace
                // collisions with the docusaurus-plugin-content-docs plugin,
                // which uses the same hashing algorithm.
                const contentPath = await actions.createData(
                    `raw-${docuHash(doc.source)}.json`,
                    JSON.stringify(fileContents),
                );
                // Remove the prefix and extension.
                const processedPath =
                    doc.source
                        .slice(aliasedSitePathPrefix.length)
                        .replace(/\.[^/.]+$/, "");
                pathToContentPath[processedPath] = contentPath
            };

            const addRouteWithModule = (config: RouteConfig) => {
                const docsPath = content.loadedVersions[0].path;
                const tagsPath = content.loadedVersions[0].tagsPath;

                // Skip routes for components such as the DocTagDocListPage and
                // DocTagsListPage.
                if (config.path.startsWith(docsPath)
                    && !config.path.startsWith(tagsPath)
                    && config.routes !== undefined
                    && config.routes.length !== 0
                ) {
                    const routesWithModule = config.routes.map(route => {
                        // Skip routes for components such as the
                        // DocCategoryGeneratedIndexPage.
                        if (route.component !== docItemComponent) {
                            return route;
                        }
                        return {
                            ...route,
                            modules: {
                                ...route.modules,
                                rawContent: pathToContentPath[route.path],
                            },
                        };
                    });
                    actions.addRoute({
                        ...config,
                        routes: routesWithModule,
                    });
                } else {
                    actions.addRoute(config);
                };
            };

            await wrappedPlugin.contentLoaded!({
                content,
                allContent,
                actions: {
                    ...actions,
                    addRoute: addRouteWithModule,
                },
            });
        },

        // This is intentionally left not async to remain consistent with the
        // wrapped code.
        getTranslationFiles({ content }) {
            return wrappedPlugin.getTranslationFiles!({ content });
        },

        translateContent({ content, translationFiles }) {
            return wrappedPlugin.translateContent!({
                content,
                translationFiles,
            });
        },

        configureWebpack(_config, isServer, utils, content) {
            return wrappedPlugin.configureWebpack!(
                _config,
                isServer,
                utils,
                content,
            );
        },
    };
};

export { validateOptions } from '@docusaurus/plugin-content-docs';
