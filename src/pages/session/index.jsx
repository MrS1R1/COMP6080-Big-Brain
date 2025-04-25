import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Card, Table, Space, Progress, Row, Col, Statistic, message, Button } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import http from '../../utils/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function SessionResults() {
    const params = useParams();
    const navigate = useNavigate();
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                // Ensure session_id exists and is valid
                const sessionId = params.session_id;
                if (!sessionId && sessionId !== '0') {
                    throw new Error('Session ID does not exist');
                }

                // First check session status
                const statusResponse = await http.get(`/admin/session/${sessionId}/status`);
                if (statusResponse.results.active) {
                    throw new Error('Session is still in progress, cannot view results');
                }

                const response = await http.get(`/admin/session/${sessionId}/results`);

                if (!response || !response.results) {
                    throw new Error('Failed to get session data');
                }
                setSessionData(response.results);
                setLoading(false);
            } catch (error) {
                message.error(error.message || 'Failed to get session data');
                setLoading(false);
                // If failed to get data, return to dashboard
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }
        };

        fetchSessionData();
    }, [params.session_id, navigate]);

    if (loading) {
        return (
            <Layout>
                <Content style={{ padding: '24px', textAlign: 'center' }}>
                    <Title level={4}>Loading...</Title>
                </Content>
            </Layout>
        );
    }

    if (!sessionData) {
        return (
            <Layout>
                <Content style={{ padding: '24px', textAlign: 'center' }}>
                    <Title level={4}>No session data found</Title>
                    <Text>Please check if the session ID is correct</Text>
                    <div style={{ marginTop: '16px' }}>
                        <Button type="primary" onClick={() => navigate('/dashboard')}>
                            Return to Home
                        </Button>
                    </div>
                </Content>
            </Layout>
        );
    }

    // Process leaderboard data
    const leaderboardData = sessionData.map(player => ({
        name: player.name,
        correctCount: player.answers ? player.answers.filter(answer => answer && answer.correct).length : 0,
        totalTime: Math.round(player.answers ? player.answers.reduce((sum, answer) => {
            if (answer && answer.questionStartedAt && answer.answeredAt) {
                return sum + (new Date(answer.answeredAt) - new Date(answer.questionStartedAt)) / 1000;
            }
            return sum;
        }, 0) : 0)
    })).sort((a, b) => {
        if (b.correctCount !== a.correctCount) {
            return b.correctCount - a.correctCount;
        }
        return a.totalTime - b.totalTime;
    });

    // Process question correct rate data
    const questionStats = sessionData[0]?.answers?.map((_, index) => {
        const totalAnswers = sessionData.length;
        const correctAnswers = sessionData.filter(player => 
            player.answers && player.answers[index] && player.answers[index].correct
        ).length;

        const avgTime = sessionData.reduce((sum, player) => {
            const answer = player.answers && player.answers[index];
            if (answer && answer.questionStartedAt && answer.answeredAt) {
                return sum + (new Date(answer.answeredAt) - new Date(answer.questionStartedAt)) / 1000;
            }
            return sum;
        }, 0) / totalAnswers;

        return {
            questionId: index + 1,
            questionTitle: `Question ${index + 1}`,
            correctRate: (correctAnswers / totalAnswers) * 100,
            avgTime: Math.round(avgTime)
        };
    }) || [];

    const totalQuestions = sessionData[0]?.answers?.length || 0;

    return (
        <Layout>
            <Header style={{ 
                background: '#fff', 
                padding: '0 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <Title level={3} style={{ margin: 0 }}>Game Results Statistics</Title>
                    <Space>
                        <Text>Session ID: {params.session_id}</Text>
                        <Button type="primary" onClick={() => navigate('/dashboard')}>
                            Return to Home
                        </Button>
                    </Space>
                </div>
            </Header>
            <Content style={{ padding: '24px' }}>
                <Row gutter={[24, 24]}>
                    <Col span={24}>
                        <Card>
                            <Row gutter={[24, 24]}>
                                <Col span={8}>
                                    <Statistic 
                                        title="Total Questions" 
                                        value={totalQuestions} 
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic 
                                        title="Number of Players" 
                                        value={sessionData.length} 
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic 
                                        title="Average Correct Rate" 
                                        value={
                                            Math.round(
                                                leaderboardData.reduce((sum, player) => 
                                                    sum + (player.correctCount / totalQuestions) * 100, 0
                                                ) / leaderboardData.length
                                            )
                                        } 
                                        suffix="%" 
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    <Col span={12}>
                        <Card title="Leaderboard">
                            <Table
                                dataSource={leaderboardData.map((item, index) => ({
                                    ...item,
                                    key: `player-${index}`
                                }))}
                                columns={[
                                    {
                                        title: 'Rank',
                                        dataIndex: 'rank',
                                        key: 'rank',
                                        render: (_, __, index) => index + 1
                                    },
                                    {
                                        title: 'Player Name',
                                        dataIndex: 'name',
                                        key: 'name'
                                    },
                                    {
                                        title: 'Correct Answers',
                                        dataIndex: 'correctCount',
                                        key: 'correctCount'
                                    },
                                    {
                                        title: 'Total Time (seconds)',
                                        dataIndex: 'totalTime',
                                        key: 'totalTime'
                                    }
                                ]}
                                pagination={false}
                            />
                        </Card>
                    </Col>

                    <Col span={12}>
                        <Card title="Question Correct Rate Statistics">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={questionStats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="questionTitle" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar 
                                        dataKey="correctRate" 
                                        name="Correct Rate" 
                                        fill="#1890ff" 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>

                    <Col span={24}>
                        <Card title="Question Details">
                            <Table
                                dataSource={questionStats.map((item, index) => ({
                                    ...item,
                                    key: `question-${index}`
                                }))}
                                columns={[
                                    {
                                        title: 'Question',
                                        dataIndex: 'questionTitle',
                                        key: 'questionTitle'
                                    },
                                    {
                                        title: 'Correct Rate',
                                        dataIndex: 'correctRate',
                                        key: 'correctRate',
                                        render: (rate) => (
                                            <Progress 
                                                percent={Math.round(rate)} 
                                                size="small" 
                                            />
                                        )
                                    },
                                    {
                                        title: 'Average Answer Time (seconds)',
                                        dataIndex: 'avgTime',
                                        key: 'avgTime'
                                    }
                                ]}
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
} 